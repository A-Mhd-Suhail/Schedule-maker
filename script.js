/* ═══════════════════════════════════════════
   YOUR GOOGLE APPS SCRIPT API URL
   ══════════════════════════════════════════ */
const API_URL = 'https://script.google.com/macros/s/AKfycbzsaWpbX6-iqDwe5w3_rnmZXwOuMAo6ncK1JjRdHhWJpug6f1zzimKFbFMRMQ8Mvgl9/exec';

let currentUser = null;

/* ═══════════════════════════════════════════
   AUTH FUNCTIONS
   ══════════════════════════════════════════ */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  if (tab === 'login') {
    document.querySelector('.auth-tab:first-child').classList.add('active');
  } else {
    document.querySelector('.auth-tab:last-child').classList.add('active');
  }
  document.getElementById(tab + 'Form').classList.add('active');
  clearMessages();
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

function showSuccess(msg) {
  const el = document.getElementById('successMsg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

function clearMessages() {
  document.getElementById('errorMsg').classList.remove('show');
  document.getElementById('successMsg').classList.remove('show');
}

async function handleSignup(e) {
  e.preventDefault();
  
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const pwd = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;

  if (!name) { showError('❌ Name is required!'); return false; }
  if (!email) { showError('❌ Email is required!'); return false; }
  if (!email.includes('@')) { showError('❌ Please enter a valid email address!'); return false; }
  if (!phone) { showError('❌ Phone number is required!'); return false; }
  if (!pwd) { showError('❌ Password is required!'); return false; }
  if (pwd.length < 6) { showError('❌ Password must be at least 6 characters!'); return false; }
  if (pwd !== confirm) { showError('❌ Passwords do not match!'); return false; }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'signup',
        email: email,
        password: pwd,
        name: name,
        phone: phone
      })
    });

    const data = await response.json();
    console.log('Signup response:', data);
    
    if (data.success) {
      showSuccess('✅ Account created successfully! Please login.');
      document.getElementById('signupForm').reset();
      setTimeout(() => switchAuthTab('login'), 2000);
    } else {
      showError('❌ ' + (data.error || 'Signup failed. Please try again.'));
    }
  } catch (err) {
    console.error('Signup error:', err);
    showError('❌ Network error. Please check your connection and try again.');
  }
  
  return false;
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const pwd = document.getElementById('loginPassword').value;

  if (!email) { showError('❌ Email is required!'); return false; }
  if (!pwd) { showError('❌ Password is required!'); return false; }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: email,
        password: pwd
      })
    });

    const data = await response.json();
    console.log('Login response:', data);

    if (data.success && data.user) {
      currentUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone
      };
      
      showSuccess('✅ Login successful!');
      
      setTimeout(() => {
        document.getElementById('authOverlay').style.display = 'none';
        document.getElementById('appWrapper').classList.add('active');
        updateUserBadge();
        document.getElementById('loginForm').reset();
        clearMessages();
      }, 1500);
    } else {
      showError('❌ ' + (data.error || 'Invalid email or password!'));
    }
  } catch (err) {
    console.error('Login error:', err);
    showError('❌ Network error. Please check your connection and try again.');
  }
  
  return false;
}

function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  currentUser = null;
  document.getElementById('appWrapper').classList.remove('active');
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  clearMessages();
}

function updateUserBadge() {
  if (!currentUser) return;
  const initial = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent = initial;
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmail').textContent = currentUser.email;
}

/* ═══════════════════════════════════════════
   MAIN APP CONSTANTS & STATE
   ══════════════════════════════════════════ */
const DAYS = 6;
const PERIODS = 5;

const COLORS = [
  '#e63946', '#2a9d8f', '#457b9d', '#f4a261', '#52b788',
  '#e9c46a', '#9b5de5', '#4cc9f0', '#f77f00', '#43aa8b',
  '#c77dff', '#06d6a0', '#ef476f', '#118ab2', '#ffd166'
];

let CLASSES = [];
let staff = [];
let grid = {};
let snapHistory = [];
let histIdx = -1;
let drag = null;

/* ═══════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════ */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
  document.getElementById('floatingBtn').classList.toggle('show', window.scrollY > 300);
});

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ═══════════════════════════════════════════
   STEP 1 — SETUP
   ══════════════════════════════════════════ */
function updateSummary() {
  const sc = +document.getElementById('staffCount').value || 1;
  const hp = +document.getElementById('hoursPerStaff').value || 1;
  document.getElementById('totalStaffDisplay').textContent = sc;
  document.getElementById('hoursPerStaffDisplay').textContent = hp;
  document.getElementById('totalSlotsDisplay').textContent = sc * hp;
  document.getElementById('totalClassesDisplay').textContent = CLASSES.length || 12;
}

function clearInstitution() {
  document.getElementById('institutionInput').value = '';
  document.getElementById('institutionDropdown').value = '';
  document.getElementById('headerSubtitle').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.getElementById('institutionDropdown');
  if (dropdown) {
    dropdown.addEventListener('change', function() {
      if (this.value) {
        document.getElementById('institutionInput').value = this.value;
        document.getElementById('headerSubtitle').textContent = this.value;
      }
    });
  }
  const input = document.getElementById('institutionInput');
  if (input) {
    input.addEventListener('input', function() {
      document.getElementById('headerSubtitle').textContent = this.value.trim();
      document.getElementById('institutionDropdown').value = '';
    });
  }
});

/* ═══════════════════════════════════════════
   STEP 2 — STAFF TABLE
   ══════════════════════════════════════════ */
function renderStaffTable() {
  const count = +document.getElementById('staffCount').value || 10;
  const defaultHrs = +document.getElementById('hoursPerStaff').value || 6;

  while (staff.length < count) {
    const i = staff.length;
    staff.push({
      name: `Staff ${i + 1}`,
      hours: defaultHrs,
      initials: `S${i + 1}`,
      color: COLORS[i % COLORS.length]
    });
  }
  if (staff.length > count) staff = staff.slice(0, count);

  const tbody = document.getElementById('staffBody');
  tbody.innerHTML = '';
  staff.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${s.name}" onchange="staff[${idx}].name=this.value"></td>
      <td><input type="number" value="${s.hours}" min="1" max="30" onchange="staff[${idx}].hours=+this.value||1"></td>
      <td><input type="text" value="${s.initials}" maxlength="5" style="text-transform:uppercase" onchange="staff[${idx}].initials=this.value.toUpperCase()"></td>
      <td>
        <div class="color-cell">
          <input type="color" value="${s.color}" onchange="staff[${idx}].color=this.value;document.getElementById('cp${idx}').style.background=this.value">
          <span class="color-preview-box" id="cp${idx}" style="background:${s.color}"></span>
        </div>
      </td>
      <td><button type="button" class="btn btn-danger btn-sm" onclick="staff.splice(${idx},1);renderStaffTable()">Remove</button></td>`;
    tbody.appendChild(tr);
  });
  updateSummary();
}

/* ═══════════════════════════════════════════
   STEP 3 — GENERATE
   ══════════════════════════════════════════ */
function generateTimetable() {
  if (!CLASSES.length) {
    CLASSES = [
      'II M.Sc.', 'I M.Sc.', 'III B.Sc. A', 'III B.Sc. B',
      'II B.Sc. A', 'II B.Sc. B', 'I B.Sc. A', 'I B.Sc. B',
      'Physics 1', 'Physics 2', 'Plant Bio', 'Zoology'
    ];
  }

  grid = {};
  CLASSES.forEach(c => grid[c] = Array(DAYS * PERIODS).fill(null));

  let pool = [];
  staff.forEach((s, i) => {
    const hrs = Math.min(s.hours, DAYS * PERIODS);
    for (let h = 0; h < hrs; h++) pool.push(i);
  });
  pool = shuffle(pool);

  let slots = [];
  CLASSES.forEach((_, ci) => {
    for (let s = 0; s < DAYS * PERIODS; s++) slots.push({ ci, s });
  });
  slots = shuffle(slots);

  for (let i = 0; i < Math.min(pool.length, slots.length); i++) {
    const { ci, s } = slots[i];
    grid[CLASSES[ci]][s] = pool[i];
  }
}

function generateAndRender() {
  generateTimetable();
  renderTimetable();
  pushHistory();
}

/* ═══════════════════════════════════════════
   STEP 3 — RENDER
   ══════════════════════════════════════════ */
function renderTimetable() {
  buildInfoStrip();
  buildLegend();

  const container = document.getElementById('daysContainer');
  container.innerHTML = '';
  if (!CLASSES.length) return;

  for (let d = 0; d < DAYS; d++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-grid';

    const hdr = document.createElement('div');
    hdr.className = 'day-header';
    hdr.textContent = `DAY ${d + 1}`;
    dayDiv.appendChild(hdr);

    const tbl = document.createElement('table');
    tbl.className = 'day-table';
    tbl.dataset.day = d;

    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    const th0 = document.createElement('th');
    th0.textContent = 'Class';
    th0.style.minWidth = '95px';
    hrow.appendChild(th0);
    for (let p = 1; p <= PERIODS; p++) {
      const th = document.createElement('th');
      th.textContent = `P${p}`;
      hrow.appendChild(th);
    }
    thead.appendChild(hrow);
    tbl.appendChild(thead);

    const tbody = document.createElement('tbody');
    CLASSES.forEach((cls, ci) => {
      const row = document.createElement('tr');

      const lbl = document.createElement('td');
      lbl.className = 'class-name-cell';
      lbl.textContent = cls;
      row.appendChild(lbl);

      for (let p = 0; p < PERIODS; p++) {
        const slot = d * PERIODS + p;
        const td = document.createElement('td');
        td.dataset.cls = cls;
        td.dataset.slot = slot;

        const si = grid[cls]?.[slot];
        if (si != null && staff[si]) {
          const s = staff[si];
          const c = s.color || COLORS[si % COLORS.length];
          const box = document.createElement('div');
          box.className = 'staff-box';
          box.draggable = true;
          box.textContent = s.initials || '?';
          box.title = `${s.name} — ${cls} / Day ${d + 1} / Period ${p + 1}`;
          box.style.backgroundColor = c + '2e';
          box.style.borderColor = c;
          box.style.color = c;
          box.dataset.cls = cls;
          box.dataset.slot = slot;
          box.dataset.staffIdx = si;
          td.appendChild(box);
        } else {
          const box = document.createElement('div');
          box.className = 'staff-box empty';
          box.textContent = '—';
          td.appendChild(box);
        }
        row.appendChild(td);
      }
      tbody.appendChild(row);
    });

    tbl.appendChild(tbody);
    dayDiv.appendChild(tbl);
    container.appendChild(dayDiv);
  }

  attachDragDrop();
  buildStaffFilter();
}

/* ═══════════════════════════════════════════
   DRAG AND DROP
   ══════════════════════════════════════════ */
function attachDragDrop() {
  document.querySelectorAll('.staff-box:not(.empty)').forEach(box => {
    box.addEventListener('dragstart', e => {
      drag = {
        cls: box.dataset.cls,
        slot: +box.dataset.slot,
        staffIdx: +box.dataset.staffIdx
      };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '1');
      box.style.opacity = '.35';
    });

    box.addEventListener('dragend', () => {
      box.style.opacity = '';
      drag = null;
      clearDropHighlights();
    });
  });

  document.querySelectorAll('.day-table td[data-slot]').forEach(td => {
    td.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      td.classList.add('dz-over');
    });

    td.addEventListener('dragleave', e => {
      if (!td.contains(e.relatedTarget)) td.classList.remove('dz-over');
    });

    td.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      td.classList.remove('dz-over');

      if (!drag) return;

      const srcCls = drag.cls;
      const srcSlot = drag.slot;
      const srcStaff = drag.staffIdx;

      const tgtCls = td.dataset.cls;
      const tgtSlot = +td.dataset.slot;

      const tgtStaff = grid[tgtCls]?.[tgtSlot] ?? null;
      grid[srcCls][srcSlot] = tgtStaff;
      grid[tgtCls][tgtSlot] = srcStaff;

      drag = null;
      renderTimetable();
      pushHistory();
    });
  });
}

function clearDropHighlights() {
  document.querySelectorAll('.dz-over').forEach(el => el.classList.remove('dz-over'));
}

/* ═══════════════════════════════════════════
   INFO & LEGEND
   ══════════════════════════════════════════ */
function buildInfoStrip() {
  const strip = document.getElementById('infoStrip');
  if (!strip) return;

  let filled = 0, total = 0;
  CLASSES.forEach(c => {
    grid[c].forEach(v => { total++; if (v != null) filled++; });
  });
  const pct = total ? Math.round(filled / total * 100) : 0;

  const counts = {};
  staff.forEach((_, i) => counts[i] = 0);
  CLASSES.forEach(c => grid[c].forEach(v => { if (v != null) counts[v] = (counts[v] || 0) + 1; }));
  const maxLoad = Math.max(0, ...Object.values(counts));
  const minLoad = staff.length ? Math.min(...Object.values(counts)) : 0;

  strip.innerHTML = `
    <div class="info-card"><div class="ic-val">${filled}</div><div class="ic-lbl">Assigned</div></div>
    <div class="info-card"><div class="ic-val">${total - filled}</div><div class="ic-lbl">Empty</div></div>
    <div class="info-card"><div class="ic-val">${pct}%</div><div class="ic-lbl">Fill</div></div>
    <div class="info-card"><div class="ic-val">${CLASSES.length}</div><div class="ic-lbl">Classes</div></div>
    <div class="info-card"><div class="ic-val">${staff.length}</div><div class="ic-lbl">Staff</div></div>
    <div class="info-card"><div class="ic-val">${maxLoad}</div><div class="ic-lbl">Max Load</div></div>
    <div class="info-card"><div class="ic-val">${minLoad}</div><div class="ic-lbl">Min Load</div></div>
  `;
}

function buildLegend() {
  const strip = document.getElementById('legendStrip');
  if (!strip) return;
  strip.innerHTML = '<span class="legend-title">🎨 Staff:</span>';
  staff.forEach((s, i) => {
    const c = s.color || COLORS[i % COLORS.length];
    const chip = document.createElement('span');
    chip.className = 'legend-chip';
    chip.textContent = `${s.initials} — ${s.name}`;
    chip.style.background = c + '22';
    chip.style.borderColor = c;
    chip.style.color = c;
    strip.appendChild(chip);
  });
}

/* ═══════════════════════════════════════════
   STAFF FILTER
   ══════════════════════════════════════════ */
function buildStaffFilter() {
  const sel = document.getElementById('staffFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All Staff</option>';
  staff.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${s.name} (${s.initials})`;
    sel.appendChild(o);
  });
  if (cur !== '' && staff[+cur]) sel.value = cur;
}

/* ═══════════════════════════════════════════
   HISTORY
   ══════════════════════════════════════════ */
function pushHistory() {
  const snap = JSON.stringify(grid);
  snapHistory = snapHistory.slice(0, histIdx + 1);
  snapHistory.push(snap);
  histIdx = snapHistory.length - 1;
  if (snapHistory.length > 60) { snapHistory.shift(); histIdx--; }
}

function saveTimetable() {
  pushHistory();
  alert('✅ Timetable saved to undo history!');
}

function undoTimetable() {
  if (histIdx > 0) {
    histIdx--;
    grid = JSON.parse(snapHistory[histIdx]);
    renderTimetable();
  } else {
    alert('❌ Nothing more to undo.');
  }
}

/* ═══════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════ */
function goStep(n) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step' + n).classList.add('active');
  document.querySelector(`.step[data-step="${n}"]`).classList.add('active');
  if (n === 1) updateSummary();
  if (n === 2) renderStaffTable();
  if (n === 3) { generateAndRender(); pushHistory(); }
  scrollToTop();
}

function goHome() {
  if (!confirm('⚠️ Going Home will erase all timetable data. Continue?')) return;
  staff = []; grid = {}; CLASSES = []; snapHistory = []; histIdx = -1;
  document.getElementById('staffCount').value = 10;
  document.getElementById('hoursPerStaff').value = 6;
  clearInstitution();
  updateSummary();
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1').classList.add('active');
  document.querySelector('.step[data-step="1"]').classList.add('active');
  document.getElementById('daysContainer').innerHTML = '';
  scrollToTop();
}

/* ═══════════════════════════════════════════
   PRINT STAFF
   ══════════════════════════════════════════ */
function printStaffTimetable() {
  const si = +document.getElementById('staffFilter').value;
  if (isNaN(si) || !staff[si]) return alert('Please select a valid staff member.');
  const s = staff[si];
  const c = s.color || COLORS[si % COLORS.length];

  const slots = [];
  CLASSES.forEach(cls => {
    grid[cls]?.forEach((v, slot) => {
      if (v === si) {
        slots.push({ cls, day: Math.floor(slot / PERIODS) + 1, period: (slot % PERIODS) + 1 });
      }
    });
  });

  if (!slots.length) { alert(`${s.name} has no assigned slots.`); return; }
  slots.sort((a, b) => a.day - b.day || a.period - b.period);

  const dayLoad = {};
  slots.forEach(({ day }) => dayLoad[day] = (dayLoad[day] || 0) + 1);

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${s.name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f1f5f9;padding:32px}.wrap{max-width:860px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.12);overflow:hidden}.top{background:linear-gradient(135deg,${c},${c}bb);color:#fff;padding:28px 36px}.top h1{font-size:1.6rem;font-weight:800;margin-bottom:4px}.top p{opacity:.85;font-size:.92rem}.cards{display:flex;gap:0;border-bottom:2px solid #f1f5f9}.card{flex:1;padding:18px 24px;border-right:2px solid #f1f5f9;text-align:center}.card:last-child{border-right:none}.card .val{font-size:2rem;font-weight:900;color:${c}}.card .lbl{font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;color:#64748b;font-weight:600;margin-top:2px}.body{padding:28px 36px}table{width:100%;border-collapse:collapse}thead tr{background:${c};color:#fff}thead th{padding:12px 16px;text-align:left;font-weight:600;font-size:.88rem}tbody td{padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:.88rem}tbody tr:hover{background:#f8fafc}.badge{display:inline-block;padding:4px 11px;border-radius:20px;font-weight:700;font-size:.8rem}.cls-badge{background:${c}22;color:${c};border:1.5px solid ${c}44}.footer{background:#f8fafc;padding:18px 36px;border-top:2px solid #e2e8f0;text-align:center}.footer p{font-size:.78rem;color:#64748b;margin-top:3px}.footer strong{color:${c}}</style></head><body><div class="wrap"><div class="top"><h1>📋 ${s.name} — Schedule</h1><p>Generated by Timetable Pro</p></div><div class="cards"><div class="card"><div class="val">${s.initials}</div><div class="lbl">Initials</div></div><div class="card"><div class="val">${slots.length}</div><div class="lbl">Periods</div></div><div class="card"><div class="val">${s.hours}</div><div class="lbl">Hours</div></div><div class="card"><div class="val">${Object.keys(dayLoad).length}</div><div class="lbl">Days</div></div></div><div class="body"><table><thead><tr><th>#</th><th>Class</th><th>Day</th><th>Period</th></tr></thead><tbody>${slots.map(({cls, day, period}, i) => `<tr><td><strong>${i+1}</strong></td><td><span class="badge cls-badge">${cls}</span></td><td>Day ${day}</td><td>Period ${period}</td></tr>`).join('')}</tbody></table></div><div class="footer"><p><strong>${s.name}</strong> — Weekly Schedule</p><p>© 2026 <strong>A Mohamed Suhail</strong> • Chennai 600037 • B.Tech CSE (Cyber Security) • VIT Andhra Pradesh</p><p>This timetable is the exclusive intellectual property of A Mohamed Suhail.</p></div></div></body></html>`);
  w.document.close();
  w.print();
}

/* ═══════════════════════════════════════════
   INIT
   ══════════════════════════════════════════ */
updateSummary();
renderStaffTable();
