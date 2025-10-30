  branches: { label: '???', parts: ['??????', '??????/?????? ?????', '?????'] },
  settings: { label: '???????', parts: ['??????', '?????', '????'] }
};

function loadUsers(){
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = [
    { id: 'admin', code: '00000', first: '?????', last: '?????', phone: '', password: '', active: true, email: 'admin@example.com', permissions: { tabs: {}, parts: {} } },
    { id: genId(), code: genCode([]), first: '?????', last: '??', phone: '09123456789', password: '1234', active: true, email: '', permissions: { tabs: {}, parts: {} } }
  ];
  saveUsers(seeded);
  return seeded;
}

function saveUsers(arr){
  localStorage.setItem(USERS_KEY, JSON.stringify(arr));
}

// Return the currently logged-in user's record (defaults to admin)
function getCurrentUser(){
  try {
    const id = localStorage.getItem(CURRENT_USER_KEY) || 'admin';
    const users = loadUsers();
    return users.find(u => u.id === id) || users.find(u => u.id === 'admin') || null;
  } catch { return null; }
}

// Show user full name beside the clock in header
function renderUserPill(){
  const el = qs('#user-pill');
  if (!el) return;
  const u = getCurrentUser();
  if (!u){ el.textContent = ''; return; }
  const full = `${u.first || ''} ${u.last || ''}`.trim() || (u.name || '');
  // Show only full name (hide initials avatar for now)
  el.innerHTML = `<span class="name">${full}</span>`;
}

function genId(){ return Math.random().toString(36).slice(2, 10); }
// Next 5-digit sequential code starting from 00001 by creation order
function genCode(existing){
  const list = Array.isArray(existing) ? existing : loadUsers();
  let max = 0;
  (list || []).forEach(u => {
    if (u && !u.email && typeof u.code === 'string' && u.code !== '00000'){
      const n = parseInt(u.code, 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  });
  const next = Math.max(0, max) + 1;
  return String(next).padStart(5, '0');
}

// Override KPI and user rendering to use localStorage-backed users
function updateKpis(){
  const users = loadUsers().filter(u => !u.email);
  const total = users.length;
  const active = users.filter(u => u.active).length;
  qs('#kpi-users') && (qs('#kpi-users').textContent = total);
  qs('#kpi-active') && (qs('#kpi-active').textContent = active);
}

function renderUsers(){
  const tbody = qs('#users-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  const headRow = qs('#tab-users thead tr');
  if (headRow){ headRow.innerHTML = '<th>?? ????</th><th>??? ? ??? ????????</th><th>????/??????????</th><th>?????</th><th>???????</th>'; }
  const users = loadUsers().filter(u => !u.email);
  users.forEach(u => {
    const tr = document.createElement('tr');
    const full = `${u.first || ''} ${u.last || ''}`.trim();
    const status = u.active ? '????' : '???????';
    tr.innerHTML = `<td>${u.code || ''}</td><td>${full}</td><td>${u.phone || ''}</td><td>${status}</td><td>
      <button class="btn" data-act="edit" data-id="${u.id}">??????</button>
      <button class="btn" data-act="perm" data-id="${u.id}">??????</button>
    </td>`;
    tbody.appendChild(tr);
