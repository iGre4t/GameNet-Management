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
      const status = (sys.prices == null) ? 'قیمت پیشفرض' : 'قیمت دلخواه';
      tr.innerHTML = `<td><input type=\"checkbox\" class=\"row-select\" data-id=\"${sys.id}\" /></td><td>${sys.name}</td><td>${status}</td><td>${btn}</td>`;
      tbody.appendChild(tr);
    });
    // header select control
    const headerSelect = qs('#header-select');
    const selectAll = qs('#select-all');
    const rowChecks = () => qsa('#systems-body .row-select');
    const setAll = (v) => rowChecks().forEach(ch => ch.checked = v);
    headerSelect && (headerSelect.onchange = () => setAll(headerSelect.checked));
    selectAll && (selectAll.onchange = () => setAll(selectAll.checked));

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
    fillDefaultPricesForm(branch);
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
  qs('#add-system-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentBranchId) return;
    const input = qs('#system-name-input');
    const name = input.value.trim();
    if (!name) return;
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    // new systems start with default prices (no custom override)
    const sys = { id: genId(), name, prices: null };
    branch.systems = branch.systems || [];
    branch.systems.push(sys);
    saveBranches(branches);
    input.value = '';
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
    const eff = getEffectivePrices(branch, sys);
    qs('#system-name').value = sys.name || '';
    qs('#price-1p').value = formatPrice(eff.p1);
    qs('#price-2p').value = formatPrice(eff.p2);
    qs('#price-3p').value = formatPrice(eff.p3);
    qs('#price-4p').value = formatPrice(eff.p4);
    qs('#price-birthday').value = formatPrice(eff.birthday);
    qs('#price-film').value = formatPrice(eff.film);
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
    // Validate non-empty and parse
    const values = [ '#price-1p', '#price-2p', '#price-3p', '#price-4p', '#price-birthday', '#price-film' ]
      .map(sel => qs(sel).value.trim());
    if (values.some(v => v === '')) { (qs('#system-form-msg').textContent = 'همه قیمت‌ها الزامی هستند'); return; }
    const toNum = (v) => { const n = parseInt(String(v).replace(/,/g,''), 10); return isNaN(n) ? 0 : n; };
    const newPrices = {
      p1: toNum(qs('#price-1p').value),
      p2: toNum(qs('#price-2p').value),
      p3: toNum(qs('#price-3p').value),
      p4: toNum(qs('#price-4p').value),
      birthday: toNum(qs('#price-birthday').value),
      film: toNum(qs('#price-film').value)
    };
    // If equal to default, clear override to use default
    if (pricesEqual(newPrices, branch.defaultPrices || zeroPrices())) {
      sys.prices = null;
    } else {
      sys.prices = newPrices;
    }
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

  // ---------- Default prices logic ----------
  const zeroPrices = () => ({ p1: 0, p2: 0, p3: 0, p4: 0, birthday: 0, film: 0 });
  const formatPrice = (n) => (Number.isFinite(n) ? n : 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const parsePrice = (s) => { const n = parseInt(String(s||'').replace(/,/g,''), 10); return isNaN(n) ? 0 : n; };
  const pricesEqual = (a,b) => ['p1','p2','p3','p4','birthday','film'].every(k => Number(a[k]||0) === Number(b[k]||0));
  const getEffectivePrices = (branch, sys) => (sys.prices == null ? (branch.defaultPrices || zeroPrices()) : sys.prices);

  const fillDefaultPricesForm = (branch) => {
    const d = branch.defaultPrices || zeroPrices();
    const map = { 'def-1p': d.p1, 'def-2p': d.p2, 'def-3p': d.p3, 'def-4p': d.p4, 'def-birthday': d.birthday, 'def-film': d.film };
    Object.entries(map).forEach(([id,val]) => { const el = qs('#'+id); if (el) el.value = formatPrice(val); });
  };

  const branchPageInit = () => {
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    fillDefaultPricesForm(branch);
    renderSystemsTable(branch);
  };

  qs('#default-prices-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    const d = {
      p1: parsePrice(qs('#def-1p').value),
      p2: parsePrice(qs('#def-2p').value),
      p3: parsePrice(qs('#def-3p').value),
      p4: parsePrice(qs('#def-4p').value),
      birthday: parsePrice(qs('#def-birthday').value),
      film: parsePrice(qs('#def-film').value)
    };
    branch.defaultPrices = d;
    saveBranches(branches);
    const msg = qs('#default-prices-msg');
    if (msg) { msg.textContent = 'ذخیره شد'; setTimeout(() => msg.textContent = '', 1500); }
    renderSystemsTable(branch);
  });

  // Format price inputs (commas)
  const priceInputs = () => qsa('.price-input');
  const onFormat = (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const raw = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
    const withCommas = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    e.target.value = withCommas;
  };
  document.addEventListener('input', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('price-input')) onFormat(e);
  });

  // ---------- Bulk changes ----------
  qs('#bulk-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    const selected = qsa('#systems-body .row-select:checked').map(ch => ch.dataset.id);
    if (!selected.length) { alert('هیچ سیستمی انتخاب نشده است'); return; }
    const targetPrices = {
      p1: parsePrice(qs('#bulk-1p').value),
      p2: parsePrice(qs('#bulk-2p').value),
      p3: parsePrice(qs('#bulk-3p').value),
      p4: parsePrice(qs('#bulk-4p').value),
      birthday: parsePrice(qs('#bulk-birthday').value),
      film: parsePrice(qs('#bulk-film').value)
    };
    const effs = selected.map(id => getEffectivePrices(branch, branch.systems.find(s => s.id === id)));
    const allSame = effs.every(p => pricesEqual(p, effs[0]));
    if (!allSame) {
      const ok = confirm('سیستم های انتخاب شده دارای قیمت / کاربری متفاوتی می باشند اگر از تغییرات مطمئن هستید ثبت کنید');
      if (!ok) return;
    }
    // Apply change; if equals default, store null to mark as default
    selected.forEach(id => {
      const sys = branch.systems.find(s => s.id === id);
      if (!sys) return;
      if (pricesEqual(targetPrices, branch.defaultPrices || zeroPrices())) sys.prices = null; else sys.prices = targetPrices;
    });
    saveBranches(branches);
    renderSystemsTable(branch);
  });

  // When entering a branch page, also fill defaults/prices, so hook into showBranchPage calls
  const originalShowBranchPage = showBranchPage;
  // Override by wrapping existing function if accessible
  // If not accessible due to scoping, call branchPageInit in the places we navigate
  // Call on initial manage->branch switch via click handlers below
});
