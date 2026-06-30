const SHEET_NAME = 'Users';
const HEADER = ['user_id', 'email', 'password', 'name', 'phone_number', 'created_at'];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = String(payload.action || '').toLowerCase();

    if (action === 'signup') return json_(signup_(payload));
    if (action === 'login') return json_(login_(payload));

    return json_({ success: false, error: 'Unknown action.' });
  } catch (err) {
    return json_({ success: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || '').toLowerCase();
  
  if (action === 'users') return json_({ success: true, users: getUsers_() });
  
  return json_({ success: true, message: 'API is working!' });
}

function signup_(payload) {
  const email = String(payload.email || '').toLowerCase().trim();
  const password = String(payload.password || '');
  const name = String(payload.name || '').trim();
  const phone = String(payload.phone || '').trim();

  if (!email || !email.includes('@')) return { success: false, error: 'Valid email required' };
  if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };
  if (!name) return { success: false, error: 'Name is required.' };
  if (!phone) return { success: false, error: 'Phone number is required.' };

  const sheet = getSheet_();
  const users = getUsers_();

  if (users.some(u => u.email === email)) {
    return { success: false, error: 'Email already registered.' };
  }

  const userId = 'USR' + Date.now();
  sheet.appendRow([userId, email, password, name, phone, new Date()]);

  return {
    success: true,
    user: { id: userId, email, name, phone }
  };
}

function login_(payload) {
  const email = String(payload.email || '').toLowerCase().trim();
  const password = String(payload.password || '');

  const user = getUsers_().find(u => u.email === email && u.password === password);
  if (!user) return { success: false, error: 'Invalid email or password.' };

  return {
    success: true,
    user: { id: user.user_id, email: user.email, name: user.name, phone: user.phone_number }
  };
}

function getUsers_() {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).filter(row => row.some(Boolean)).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] == null ? '' : String(row[i]));
    return obj;
  });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  }
  return sheet;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
