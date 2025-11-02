const AUTH_KEY = "gamenet_auth";
const PASS_KEY = "gamenet_admin_password";
const CURRENT_USER_KEY = 'gamenet_current_user_id';

// Demo in-memory users
const USER_DB = [
  { name: "????", email: "admin@example.com", active: true },
  { name: "????? 1", phone: "09123456789", email: "", active: true }
];

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function setView(loggedIn) {
  const login = qs('#login-view');
  const app = qs('#app-view');
  if (loggedIn) {
    login.classList.add('hidden');
    app.classList.remove('hidden');
    renderUsers();
    updateKpis();
    try { renderUserPill(); } catch {}
    try { if (typeof renderProfileBox === 'function') renderProfileBox(); } catch {}
  } else {
    app.classList.add('hidden');
    login.classList.remove('hidden');
  }
}

function updateKpis() {
  const total = USER_DB.length;
  const active = USER_DB.filter(u => u.active).length;
  qs('#kpi-users').textContent = total;
  qs('#kpi-active').textContent = active;
}

function renderUsers() {
  const tbody = qs('#users-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  // Show users that are logged in and have no email
  USER_DB.filter(u => (!u.email || u.email === '') && u.active).forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.name}</td><td>${u.phone || ''}</td><td>${u.active ? '????' : '???????'}</td>`;
    tbody.appendChild(tr);
  });
}

function setActiveTab(tab) {
  qsa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
  const titles = { home: '????', users: '???????', settings: '???????' };
  const el = qs('#page-title');
  if (el) el.textContent = titles[tab] || '';
}

document.addEventListener('DOMContentLoaded', () => {
  // Init password storage
  if (!localStorage.getItem(PASS_KEY)) localStorage.setItem(PASS_KEY, '1234');
  const token = localStorage.getItem(AUTH_KEY);
  setView(Boolean(token));

  // Login
  const form = qs('#login-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = qs('#username').value.trim();
    const pass = qs('#password').value;
    const err = qs('#login-error');
    const saved = localStorage.getItem(PASS_KEY) || '1234';
    if (user === 'admin' && pass === saved) {
      localStorage.setItem(AUTH_KEY, 'ok');
      try { localStorage.setItem(CURRENT_USER_KEY, 'admin'); } catch {}
      err.textContent = '';
      setView(true);
      setActiveTab('home');
      try { renderUserPill(); } catch {}
      try { if (typeof renderProfileBox === 'function') renderProfileBox(); } catch {}
    } else {
      err.textContent = '???? ?????? ???. ???? ??????? ?? ????? ????.';
    }
  });

  // Enhanced login: capture-phase handler to support staff users
  const formX = qs('#login-form');
  formX?.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    const user = qs('#username').value.trim();
    const pass = qs('#password').value;
    const err = qs('#login-error');
    const saved = localStorage.getItem(PASS_KEY) || '1234';
    let ok = false;

    if (user === 'admin' && pass === saved) {
      localStorage.setItem(AUTH_KEY, 'ok');
      try { localStorage.setItem(CURRENT_USER_KEY, 'admin'); } catch {}
      ok = true;
    } else {
      try {
        const users = (typeof loadUsers === 'function') ? loadUsers().filter(u => !u.email) : [];
        const found = users.find(u => (u.phone === user) || (u.code === user));
        if (found && found.active && (String(found.password || '') === String(pass))) {
          localStorage.setItem(AUTH_KEY, 'ok');
          try { localStorage.setItem(CURRENT_USER_KEY, found.id); } catch {}
          ok = true;
        }
      } catch {}
    }

    if (ok) {
      if (err) err.textContent = '';
      setView(true);
      setActiveTab('home');
      try { renderUserPill(); } catch {}
      try { if (typeof renderProfileBox === 'function') renderProfileBox(); } catch {}
    } else {
      if (err) err.textContent = '???? ?????? ???. ???? ??????? ?? ????? ????.';
    }
  }, true);

  // Logout
  qs('#logout')?.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    try { localStorage.removeItem(CURRENT_USER_KEY); } catch {}
    setView(false);
  });

  // Tabs
  qsa('.nav-item').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

  // Live clock using selected timezone; default Tehran (Asia/Tehran)
  const TIMEZONE_KEY = 'gamenet_timezone';
  function getTimeZone(){
    return localStorage.getItem(TIMEZONE_KEY) || 'Asia/Tehran';
  }
  function renderClock(){
    const el = qs('#live-clock'); if (!el) return;
    const tz = getTimeZone();
    const now = new Date();
    const time = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone: tz });
    // Compose Persian (Jalali) date parts explicitly to keep RTL order stable
    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz
    }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    // RTL-friendly order: weekday? day month year
    const dateFa = `${parts.weekday}? ${parts.day} ${parts.month} ${parts.year}`;
    el.innerHTML = `<span class="time">${time}</span><span class="date">${dateFa}</span>`;
  }
  renderClock();
  setInterval(renderClock, 1000);
  try { renderUserPill(); } catch {}
  try { if (typeof renderProfileBox === 'function') renderProfileBox(); } catch {}

  // Sidebar toggle (compact)
  qs('#sidebarToggle')?.addEventListener('click', () => {
    const app = qs('#app-view');
    if (!app) return;
    // Toggle collapsed class instead of inline styles so CSS can hide labels
    app.classList.toggle('collapsed');
    // Clear any previous inline width to let CSS take over
    app.style.gridTemplateColumns = '';
  });

  // Add user via modal (phone + password)
  const openUserModal = () => qs('#user-modal')?.classList.remove('hidden');
  const closeUserModal = () => {
    const m = qs('#user-modal');
    if (!m) return;
    m.classList.add('hidden');
    const f = qs('#user-form');
    if (f) f.reset();
    const msg = qs('#user-form-msg');
    if (msg) msg.textContent = '';
  };

