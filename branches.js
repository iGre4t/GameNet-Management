// Branches (مدیریت شعب)
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

document.addEventListener('DOMContentLoaded', () => {
  const BRANCHES_KEY = 'gamenet_branches';
  const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const loadBranches = () => { try { return JSON.parse(localStorage.getItem(BRANCHES_KEY) || '[]'); } catch { return []; } };
  const saveBranches = (data) => localStorage.setItem(BRANCHES_KEY, JSON.stringify(data));

  let branches = loadBranches();
  let currentBranchId = null;

  const setTitle = (t) => { const el = qs('#page-title'); if (el) el.textContent = t; };

  const setSubnavActive = (key) => {
    qsa('#branch-subnav .sub-item').forEach(el => el.classList.toggle('active', el.dataset.view === String(key)));
  };

  const renderBranchSubnav = () => {
    const wrap = qs('#branch-items');
    if (!wrap) return;
    wrap.innerHTML = '';
    branches.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'sub-item';
      btn.dataset.view = b.id;
      btn.textContent = b.name || 'شعبه بی‌نام';
      btn.addEventListener('click', () => showBranchPage(b.id));
      wrap.appendChild(btn);
    });
    setSubnavActive(currentBranchId ? currentBranchId : 'manage');
  };

  const renderBranchesTable = () => {
    const tbody = qs('#branches-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    branches.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${b.name}</td><td><button class="btn" data-open="${b.id}">باز کردن</button></td>`;
      tbody.appendChild(tr);
    });
    qsa('#branches-body button[data-open]').forEach(btn => {
      btn.addEventListener('click', () => showBranchPage(btn.getAttribute('data-open')));
    });
  };

  const renderSystemsTable = (branch) => {
    const tbody = qs('#systems-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    (branch.systems || []).forEach(sys => {
      const tr = document.createElement('tr');
      const btn = `<button class=\"btn\" data-sys=\"${sys.id}\">تنظیمات</button>`;
      tr.innerHTML = `<td>${sys.name}</td><td>${btn}</td>`;
      tbody.appendChild(tr);
    });
    qsa('#systems-body button[data-sys]').forEach(btn => {
      btn.addEventListener('click', () => openSystemModal(branch.id, btn.getAttribute('data-sys')));
    });
  };

  const showManageView = () => {
    currentBranchId = null;
    setSubnavActive('manage');
    const m = qs('#branch-manage-view');
    const p = qs('#branch-page-view');
    if (m && p) { m.classList.remove('hidden'); p.classList.add('hidden'); }
    renderBranchesTable();
  };

  const showBranchPage = (branchId) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    currentBranchId = branch.id;
    setSubnavActive(branch.id);
    const m = qs('#branch-manage-view');
    const p = qs('#branch-page-view');
    if (m && p) { m.classList.add('hidden'); p.classList.remove('hidden'); }
    const t = qs('#branch-page-title');
    if (t) t.textContent = `شعبه: ${branch.name}`;
    renderSystemsTable(branch);
  };

  // Add branch
  qs('#add-branch-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = qs('#branch-name');
    const name = input.value.trim();
    if (!name) return;
    const b = { id: genId(), name, systems: [] };
    branches.push(b);
    saveBranches(branches);
    input.value = '';
    renderBranchSubnav();
    renderBranchesTable();
  });

  // Manage subnav button
  qs('#branch-subnav')?.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.matches('.sub-item[data-view="manage"]')) showManageView();
  });

  // Add system
  qs('#add-system')?.addEventListener('click', () => {
    if (!currentBranchId) return;
    const name = prompt('نام سیستم را وارد کنید:');
    if (!name) return;
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    const sys = { id: genId(), name, prices: { p1: 0, p2: 0, p3: 0, p4: 0, birthday: 0, film: 0 } };
    branch.systems = branch.systems || [];
    branch.systems.push(sys);
    saveBranches(branches);
    renderSystemsTable(branch);
  });

  // Modal helpers
  const openSystemModal = (branchId, systemId) => {
    const m = qs('#system-modal');
    const form = qs('#system-form');
    if (!m || !form) return;
    const branch = branches.find(b => b.id === branchId);
    const sys = branch?.systems?.find(s => s.id === systemId);
    if (!sys) return;
    qs('#system-name').value = sys.name || '';
    qs('#price-1p').value = sys.prices?.p1 ?? '';
    qs('#price-2p').value = sys.prices?.p2 ?? '';
    qs('#price-3p').value = sys.prices?.p3 ?? '';
    qs('#price-4p').value = sys.prices?.p4 ?? '';
    qs('#price-birthday').value = sys.prices?.birthday ?? '';
    qs('#price-film').value = sys.prices?.film ?? '';
    form.dataset.branchId = branchId;
    form.dataset.systemId = systemId;
    m.classList.remove('hidden');
  };

  const closeSystemModal = () => {
    const m = qs('#system-modal');
    const form = qs('#system-form');
    if (m) m.classList.add('hidden');
    if (form) { form.reset(); form.dataset.branchId = ''; form.dataset.systemId = ''; }
    const msg = qs('#system-form-msg');
    if (msg) msg.textContent = '';
  };

  qs('#system-cancel')?.addEventListener('click', closeSystemModal);
  qs('#system-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const branchId = form.dataset.branchId;
    const systemId = form.dataset.systemId;
    const branch = branches.find(b => b.id === branchId);
    const sys = branch?.systems?.find(s => s.id === systemId);
    if (!branch || !sys) return;
    sys.name = qs('#system-name').value.trim() || sys.name;
    const toNum = (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
    sys.prices = {
      p1: toNum(qs('#price-1p').value),
      p2: toNum(qs('#price-2p').value),
      p3: toNum(qs('#price-3p').value),
      p4: toNum(qs('#price-4p').value),
      birthday: toNum(qs('#price-birthday').value),
      film: toNum(qs('#price-film').value)
    };
    saveBranches(branches);
    closeSystemModal();
    if (currentBranchId === branch.id) renderSystemsTable(branch);
  });

  // Initialize on switching to branches tab
  qsa('.nav-item').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'branches') {
      setTimeout(() => setTitle('مدیریت شعب'), 0);
      renderBranchSubnav();
      showManageView();
    }
  }));
});
