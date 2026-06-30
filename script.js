// ═══════════════════════════════════════════════════════════════
// IMPROVED BACKEND – WITH HASHING, RATE LIMITING, VALIDATION
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME = 'Users';
const HEADER = ['user_id', 'email', 'password_hash', 'name', 'phone_number', 'created_at'];
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// ─── MAIN HANDLERS ──────────────────────────────────────────────

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = String(payload.action || '').toLowerCase().trim();

    if (action === 'signup') return json_(signup_(payload));
    if (action === 'login') return json_(login_(payload));

    return json_({ success: false, error: 'Unknown action.' });
  } catch (err) {
    console.error('doPost error:', err);
    return json_({ success: false, error: 'Server error. Please try again.' });
  }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || '').toLowerCase();

  if (action === 'users') return json_({ success: true, users: getUsers_() });
  if (action === 'health') return json_({ success: true, message: 'API is working!' });

  return json_({ success: true, message: 'Timetable API v1.0' });
}

// ─── PASSWORD HASHING ──────────────────────────────────────────

function hashPassword_(password) {
  if (!password) throw new Error('Password cannot be empty');
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return Utilities.base64Encode(hash);
}

function verifyPassword_(password, hash) {
  try {
    return hashPassword_(password) === hash;
  } catch (_) { return false; }
}

// ─── INPUT VALIDATION ──────────────────────────────────────────

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone_(phone) {
  const digits = phone.replace(/\D/g, '');
  return /^[\d\s\-\+\(\)]+$/.test(phone) && digits.length >= 7;
}

function validatePassword_(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('special character');
  return { valid: errors.length === 0, errors };
}

function sanitize_(str) {
  return String(str).trim().substring(0, 255).replace(/[<>]/g, '');
}

// ─── RATE LIMITING ─────────────────────────────────────────────

function getCache_() { return CacheService.getScriptCache(); }

function isAccountLocked_(email) {
  const cache = getCache_();
  const lockTime = cache.get(`lock_${email}`);
  if (lockTime) {
    if (Date.now() - parseInt(lockTime) < LOCKOUT_TIME) return true;
    cache.remove(`lock_${email}`);
  }
  return false;
}

function lockAccount_(email) {
  getCache_().put(`lock_${email}`, String(Date.now()), 900); // 15 min
}

function incrementAttempts_(email) {
  const cache = getCache_();
  const key = `attempts_${email}`;
  const attempts = parseInt(cache.get(key) || '0') + 1;
  cache.put(key, String(attempts), 900);
  return attempts;
}

function resetAttempts_(email) {
  getCache_().remove(`attempts_${email}`);
}

// ─── SIGNUP ─────────────────────────────────────────────────────

function signup_(data) {
  try {
    const email = String(data.email || '').toLowerCase().trim();
    const password = String(data.password || '');
    const name = sanitize_(data.name || '');
    const phone = sanitize_(data.phone || '');

    // Validate
    if (!name || name.length < 2) return { success: false, error: 'Name must be at least 2 characters.' };
    if (!isValidEmail_(email)) return { success: false, error: 'Valid email is required.' };
    if (!isValidPhone_(phone)) return { success: false, error: 'Phone number format is invalid.' };

    const pwdVal = validatePassword_(password);
    if (!pwdVal.valid) {
      return { success: false, error: 'Password: ' + pwdVal.errors.join(', ') };
    }

    const sheet = getSheet_();
    const users = getUsers_();
    if (users.some(u => u.email === email)) {
      return { success: false, error: 'Email already registered.' };
    }

    const userId = 'USR' + Date.now();
    const passwordHash = hashPassword_(password);
    sheet.appendRow([userId, email, passwordHash, name, phone, new Date()]);

    logActivity_('SIGNUP', email, 'User registered successfully');

    return {
      success: true,
      user: { id: userId, email, name, phone }
    };
  } catch (err) {
    console.error('Signup error:', err);
    logActivity_('SIGNUP_ERROR', data.email || 'unknown', String(err));
    return { success: false, error: 'Signup failed. Please try again.' };
  }
}

// ─── LOGIN ──────────────────────────────────────────────────────

function login_(data) {
  try {
    const email = String(data.email || '').toLowerCase().trim();
    const password = String(data.password || '');

    if (!email) return { success: false, error: 'Email is required.' };
    if (!password) return { success: false, error: 'Password is required.' };

    // Check lock
    if (isAccountLocked_(email)) {
      logActivity_('LOGIN_BLOCKED', email, 'Account locked');
      return { success: false, error: 'Account locked. Try again later.' };
    }

    const users = getUsers_();
    const user = users.find(u => u.email === email);

    if (!user) {
      incrementAttempts_(email);
      logActivity_('LOGIN_FAILED', email, 'User not found');
      return { success: false, error: 'Invalid email or password.' };
    }

    // Verify password
    if (!verifyPassword_(password, user.password_hash)) {
      const attempts = incrementAttempts_(email);
      logActivity_('LOGIN_FAILED', email, `Wrong password. Attempt ${attempts}`);
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        lockAccount_(email);
        return { success: false, error: 'Too many failed attempts. Account locked for 15 minutes.' };
      }
      return { success: false, error: `Invalid email or password. (${attempts}/${MAX_LOGIN_ATTEMPTS})` };
    }

    // Success
    resetAttempts_(email);
    logActivity_('LOGIN_SUCCESS', email, 'User logged in');

    return {
      success: true,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name,
        phone: user.phone_number
      }
    };
  } catch (err) {
    console.error('Login error:', err);
    logActivity_('LOGIN_ERROR', data.email || 'unknown', String(err));
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

// ─── DATABASE OPERATIONS ───────────────────────────────────────

function getUsers_() {
  try {
    const sheet = getSheet_();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => String(h).trim());
    return data.slice(1)
      .filter(row => row.some(Boolean))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i] == null ? '' : String(row[i]));
        return obj;
      });
  } catch (err) {
    console.error('getUsers_ error:', err);
    return [];
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
    // Style header
    const range = sheet.getRange(1, 1, 1, HEADER.length);
    range.setBackground('#667eea').setFontColor('#ffffff').setFontWeight('bold');
  }
  return sheet;
}

// ─── LOGGING ────────────────────────────────────────────────────

function logActivity_(action, email, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('Logs');
    if (!logSheet) {
      logSheet = ss.insertSheet('Logs');
      logSheet.appendRow(['Timestamp', 'Action', 'Email', 'Details']);
    }
    logSheet.appendRow([new Date(), action, email, details]);
  } catch (err) {
    console.error('Log error:', err);
  }
}

// ─── UTILITY ────────────────────────────────────────────────────

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── MIGRATION (Run once to hash existing plaintext passwords) ─

function migratePasswords_() {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const emailIdx = headers.indexOf('email');
  const passwordIdx = headers.indexOf('password');
  const passwordHashIdx = headers.indexOf('password_hash');

  if (emailIdx === -1 || passwordIdx === -1 || passwordHashIdx === -1) {
    throw new Error('Required columns not found.');
  }

  let migrated = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const plain = String(row[passwordIdx] || '');
    if (!plain) continue;

    // Skip if already hashed (base64 length ~88)
    if (plain.length === 88 && /^[A-Za-z0-9+/=]+$/.test(plain)) continue;

    try {
      const hash = hashPassword_(plain);
      sheet.getRange(i + 1, passwordHashIdx + 1).setValue(hash);
      sheet.getRange(i + 1, passwordIdx + 1).setValue(''); // clear plaintext
      migrated++;
      console.log(`Migrated row ${i+1} (${row[emailIdx]})`);
    } catch (err) {
      console.error(`Failed row ${i+1}:`, err);
    }
  }
  console.log(`✅ Migration complete. ${migrated} passwords hashed.`);
}
