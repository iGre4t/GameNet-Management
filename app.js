const AUTH_KEY = "gamenet_auth";
const PASS_KEY = "gamenet_admin_password";

// Demo in-memory users
const USER_DB = [
  { name: "مدیر", email: "admin@example.com", active: true },
  { name: "کاربر 1", phone: "09123456789", email: "", active: true }
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
    tr.innerHTML = `<td>${u.name}</td><td>${u.phone || ''}</td><td>${u.active ? 'فعال' : 'غیرفعال'}</td>`;
    tbody.appendChild(tr);
  });
}

function setActiveTab(tab) {
  qsa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
  const titles = { home: 'خانه', users: 'کاربران', settings: 'تنظیمات' };
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
      err.textContent = '';
      setView(true);
      setActiveTab('home');
    } else {
      err.textContent = 'ورود ناموفق بود. لطفا اطلاعات را بررسی کنید.';
    }
  });

  // Logout
  qs('#logout')?.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    setView(false);
  });

  // Tabs
  qsa('.nav-item').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

  // Sidebar toggle (compact)
  qs('#sidebarToggle')?.addEventListener('click', () => {
    const app = qs('#app-view');
    if (!app) return;
    const isNarrow = getComputedStyle(app).gridTemplateColumns.split(' ')[0].includes('72px');
    app.style.gridTemplateColumns = isNarrow ? '260px 1fr' : '72px 1fr';
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

  qs('#add-user')?.addEventListener('click', openUserModal);
  qs('#user-cancel')?.addEventListener('click', closeUserModal);
  qs('#user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = qs('#user-phone').value.trim();
    const pass = qs('#user-pass').value;
    const msg = qs('#user-form-msg');
    if (!/^\d{11}$/.test(phone)) {
      msg.textContent = 'شماره تلفن باید ۱۱ رقم باشد.';
      return;
    }
    if (!pass || pass.length < 4) {
      msg.textContent = 'رمز حداقل ۴ کاراکتر باشد.';
      return;
    }
    const idx = USER_DB.length + 1;
    USER_DB.push({ name: `کاربر ${idx}`, phone, email: "", password: pass, active: true });
    renderUsers();
    updateKpis();
    closeUserModal();
  });

  // Privacy: change admin password
  qs('#privacy-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const cur = qs('#current-pass').value;
    const np = qs('#new-pass').value;
    const cp = qs('#confirm-pass').value;
    const msg = qs('#privacy-msg');
    const saved = localStorage.getItem(PASS_KEY) || '1234';
    if (cur !== saved) {
      msg.textContent = 'رمز فعلی نادرست است.';
      return;
    }
    if (np.length < 4) {
      msg.textContent = 'رمز جدید حداقل ۴ کاراکتر باشد.';
      return;
    }
    if (np !== cp) {
      msg.textContent = 'تکرار رمز جدید یکسان نیست.';
      return;
    }
    localStorage.setItem(PASS_KEY, np);
    msg.textContent = 'رمز با موفقیت به‌روزرسانی شد.';
  });
});

