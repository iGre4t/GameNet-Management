const AUTH_KEY = "gamenet_auth";
const USER_DB = [{ name: "ادمین", email: "admin@example.com", active: true }];

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
  tbody.innerHTML = '';
  USER_DB.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.name}</td><td>${u.email}</td><td>${u.active ? 'فعال' : 'غیرفعال'}</td>`;
    tbody.appendChild(tr);
  });
}

function setActiveTab(tab) {
  qsa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
  const titles = { home: 'خانه', users: 'کاربران', settings: 'تنظیمات' };
  qs('#page-title').textContent = titles[tab] || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(AUTH_KEY);
  setView(Boolean(token));

  // Login
  const form = qs('#login-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = qs('#username').value.trim();
    const pass = qs('#password').value;
    const err = qs('#login-error');
    if (user === 'admin' && pass === '1234') {
      localStorage.setItem(AUTH_KEY, 'ok');
      err.textContent = '';
      setView(true);
      setActiveTab('home');
    } else {
      err.textContent = 'ورود نامعتبر. لطفاً اطلاعات را بررسی کنید.';
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

  // Add user demo
  qs('#add-user')?.addEventListener('click', () => {
    const idx = USER_DB.length + 1;
    USER_DB.push({ name: `کاربر ${idx}`, email: `user${idx}@example.com`, active: Math.random() > 0.3 });
    renderUsers();
    updateKpis();
  });
});

