// Branches (تنظیمات شعب)
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

document.addEventListener('DOMContentLoaded', () => {
  const BRANCHES_KEY = 'gamenet_branches';
  const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const loadBranches = () => { try { return JSON.parse(localStorage.getItem(BRANCHES_KEY) || '[]'); } catch { return []; } };
  const saveBranches = (data) => localStorage.setItem(BRANCHES_KEY, JSON.stringify(data));

  let branches = loadBranches();
  let currentBranchId = null;
  let currentPeriodId = null;
  let currentBranchInnerTab = 'general';

  // Ensure new sections exist on branch object
  function ensureBranchExtras(b){
    if (!b) return b;
    b.buffetCategories = Array.isArray(b.buffetCategories) ? b.buffetCategories : [];
    b.buffetItems = Array.isArray(b.buffetItems) ? b.buffetItems : [];
    b.kitchenItems = Array.isArray(b.kitchenItems) ? b.kitchenItems : [];
    b.specialItems = Array.isArray(b.specialItems) ? b.specialItems : [];
    b.printerSystemKey = (typeof b.printerSystemKey === 'string') ? b.printerSystemKey : '';
    // General settings fields
    b.address = (typeof b.address === 'string') ? b.address : '';
    b.phone1 = (typeof b.phone1 === 'string') ? b.phone1 : '';
    b.phone2 = (typeof b.phone2 === 'string') ? b.phone2 : '';
    b.employees = Array.isArray(b.employees) ? b.employees : [];
    return b;
  }

  // Period helpers
  const DAY_MIN = 24*60;
  const toMin = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    const parts = hhmm.split(':');
    const h = parseInt(parts[0]||'0',10);
    const m = parseInt(parts[1]||'0',10);
    let t = (isNaN(h)?0:h)*60 + (isNaN(m)?0:m);
    if (!Number.isFinite(t)) t = 0;
    return Math.max(0, Math.min(DAY_MIN, t));
  };
  const toHHMM = (min) => {
    const x = Math.max(0, Math.min(DAY_MIN, Number(min)||0));
    const hh = String(Math.floor(x/60)).padStart(2,'0');
    const mm = String(x%60).padStart(2,'0');
    return `${hh}:${mm}`;
  };
  const labelPeriod = (p) => `${toHHMM(p.start)} - ${toHHMM(p.end)}`;
  const ensureBranchPeriods = (b) => {
    if (!b.periods || !Array.isArray(b.periods) || b.periods.length === 0){
      const defaults = b.defaultPrices || zeroPrices();
      b.periods = [{ id: genId(), start: 0, end: DAY_MIN, defaultPrices: defaults }];
    }
    return b;
  };

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
      btn.textContent = b.name || 'Ø´Ø¹Ø¨Ù‡ Ø¨ÛŒâ€ŒÙ†Ø§Ù…';
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
      tr.innerHTML = `<td>${b.name}</td><td><button class="btn" data-open="${b.id}">مدیریت شعبه</button></td>`;
      tbody.appendChild(tr);
    });
    qsa('#branches-body button[data-open]').forEach(btn => {
      btn.addEventListener('click', () => showBranchPage(btn.getAttribute('data-open')));
    });
    // Add delete buttons to branch rows
    qsa('#branches-body tr').forEach((tr) => {
      const openBtn = tr.querySelector('button[data-open]');
      if (!openBtn) return;
      const id = openBtn.getAttribute('data-open');
      const tds = tr.querySelectorAll('td');
      const actionTd = tds[1];
      if (actionTd && !actionTd.querySelector('[data-del-branch]')){
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn danger';
        del.textContent = 'حذف';
        del.setAttribute('data-del-branch', id);
        del.addEventListener('click', () => {
          const idx = branches.findIndex(b => b.id === id);
          const br = branches[idx];
          if (idx < 0 || !br) return;
          // Show clean Persian delete confirmation and bypass garbled text
          openConfirm(`حذف «${br.name}»؟ این عملیات قابل بازگشت است.`, () => {
            const removed = branches.splice(idx, 1)[0];
            saveBranches(branches);
            renderBranchesTable();
            showUndoToast({ type: 'branch', payload: removed, index: idx });
          });
          return;
          openConfirm(`حذف Ø´Ø¹Ø¨Ù‡ Â«${br.name}Â»ØŸ Ø§ÛŒÙ† Ø¹Ù…Ù„ÛŒØ§Øª Ù‚Ø§Ø¨Ù„ Ø¨Ø§Ø²Ú¯Ø´Øª Ø§Ø³Øª.`, () => {
            const removed = branches.splice(idx, 1)[0];
            saveBranches(branches);
            renderBranchesTable();
            showUndoToast({ type: 'branch', payload: removed, index: idx });
          });
        });
        actionTd.appendChild(del);
      }
    });
  };

  const renderSystemsTable = (branch) => {
    const tbody = qs('#systems-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    (branch.systems || []).forEach(sys => {
      const tr = document.createElement('tr');
      const btn = `<button class=\"btn\" data-sys=\"${sys.id}\">تنظیمات تعرفه</button>`;
      const status = (sys.prices == null) ? 'تعرفه پیشفرض' : 'تعرفه دلخواه';
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
      btn.textContent = 'ویرایش';
      btn.addEventListener('click', () => openSystemModal(branch.id, btn.getAttribute('data-sys')));
    });
    // Update status cells and add delete buttons using current period
    qsa('#systems-body .row-select').forEach((ch, idx) => {
      const tr = ch.closest('tr');
      if (!tr) return;
      const tds = tr.querySelectorAll('td');
      const statusTd = tds[2];
      const actionTd = tds[3];
      const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
      const sys = (branch.systems||[]).find(s => s.id === ch.dataset.id);
      if (sys && statusTd){
        const hasOverride = !!(sys.pricesByPeriod && sys.pricesByPeriod[pid]);
        statusTd.textContent = hasOverride ? 'تعرفه دلخواه' : 'تعرفه پیشفرض';
      }
      if (actionTd && !actionTd.querySelector('[data-del-sys]')){
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn danger';
        del.textContent = 'حذف';
        del.setAttribute('data-del-sys', ch.dataset.id);
        del.textContent = 'حذف';
        del.setAttribute('data-index', String(idx));
        del.addEventListener('click', () => {
          const sys = (branch.systems||[]).find(s => s.id === ch.dataset.id);
          if (!sys) return;
          // Show clean Persian delete confirmation and bypass garbled text
          openConfirm(`حذف «${sys.name}»؟ این عملیات قابل بازگشت است.`, () => {
            const i = (branch.systems||[]).findIndex(s => s.id === ch.dataset.id);
            if (i >= 0){
              const removed = branch.systems.splice(i, 1)[0];
              saveBranches(branches);
              renderSystemsTable(branch);
              showUndoToast({ type: 'system', payload: removed, branchId: branch.id, index: i });
            }
          });
          return;
          openConfirm(`حذف Ø³ÛŒØ³ØªÙ… Â«${sys.name}Â»ØŸ Ø§ÛŒÙ† Ø¹Ù…Ù„ÛŒØ§Øª Ù‚Ø§Ø¨Ù„ Ø¨Ø§Ø²Ú¯Ø´Øª Ø§Ø³Øª.`, () => {
            const i = (branch.systems||[]).findIndex(s => s.id === ch.dataset.id);
            if (i >= 0){
              const removed = branch.systems.splice(i, 1)[0];
              saveBranches(branches);
              renderSystemsTable(branch);
              showUndoToast({ type: 'system', payload: removed, branchId: branch.id, index: i });
            }
          });
        });
        actionTd.appendChild(del);
      }
    });
    // Localize status text after render
    try {
      const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
      qsa('#systems-body .row-select').forEach(ch => {
        const tr = ch.closest('tr'); if (!tr) return;
        const statusTd = tr.querySelectorAll('td')[2];
        const sys = (branch.systems||[]).find(s => s.id === ch.dataset.id);
        if (statusTd && sys){
          const hasOverride = !!(sys.pricesByPeriod && sys.pricesByPeriod[pid]);
          statusTd.textContent = hasOverride ? 'قیمت سفارشی' : 'بدون سفارشی‌سازی';
        }
      });
    } catch {}
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
    if (t) t.textContent = `شعبه ${branch.name}`;
    renderPeriodSelect(branch);
    fillDefaultPricesForm(branch);
    renderSystemsTable(branch);
    // Prepare inner tabs content and render other sections
    (function(){
      const branch = branches.find(b => b.id === currentBranchId);
      ensureBranchExtras(branch);
      ensureGeneralTabElements();
      renderBranchGeneral(branch);
      const sysSec = qs('#branch-tab-systems');
      if (sysSec){
        const bpv = qs('#branch-page-view');
        [...bpv.children].forEach(ch => { if (ch.classList && ch.classList.contains('card')) sysSec.appendChild(ch); });
      }
      // Show general tab by default
      const ids = ['general','systems','buffet','kitchen','special','tech'];
      ids.forEach(k => { const sec = qs('#branch-tab-'+k); if (sec) sec.classList.toggle('hidden', k !== 'general'); });
      setBranchInnerTab('general');
      renderBuffet(branch);
      renderKitchen(branch);
      renderSpecial(branch);
      // ensure tech button exists and set printer key
      try {
        const tabs = qs('#branch-top-tabs');
        if (tabs && !tabs.querySelector('[data-branch-tab="tech"]')){
          const btn = document.createElement('button');
          btn.className = 'branch-tab-btn';
          btn.setAttribute('data-branch-tab','tech');
          btn.textContent = 'تنظیمات فنی';
          tabs.appendChild(btn);
        }
      } catch {}
      const keyInput = qs('#printer-system-key');
      if (keyInput) keyInput.value = branch.printerSystemKey || '';
      // update currency unit labels for default prices
      try { setDefaultPricesCurrencyLabels && setDefaultPricesCurrencyLabels(); } catch {}
      // Localize UI texts for Persian
      try {
        const tbs = qs('#branch-top-tabs');
        if (tbs){
          const b1 = tbs.querySelector('[data-branch-tab="systems"]'); if (b1) b1.textContent = 'سیستم‌ها';
          const b2 = tbs.querySelector('[data-branch-tab="buffet"]'); if (b2) b2.textContent = 'بوفه';
          const b3 = tbs.querySelector('[data-branch-tab="kitchen"]'); if (b3) b3.textContent = 'آشپزخانه';
          const b4 = tbs.querySelector('[data-branch-tab="special"]'); if (b4) b4.textContent = 'آیتم‌های خاص';
        }
        const sysName = qs('#system-name-input'); if (sysName) sysName.setAttribute('placeholder','نام سیستم');
        const addBtn = qs('#add-system-form button[type="submit"]'); if (addBtn) addBtn.textContent = 'افزودن سیستم';
        const headThs = qsa('#branch-tab-systems thead th');
        if (headThs && headThs.length >= 4){ headThs[1].textContent = 'نام سیستم'; headThs[2].textContent = 'وضعیت قیمت'; headThs[3].textContent = 'عملیات'; }
      } catch {}
    })();
  };

  // Add branch
  qs('#add-branch-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = qs('#branch-name');
    const name = input.value.trim();
    if (!name) return;
    const b = { id: genId(), name, systems: [], periods: [{ id: genId(), start: 0, end: 24*60, defaultPrices: zeroPrices() }] };
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
    ensureBranchPeriods(branch);
    const pid = currentPeriodId || branch.periods[0]?.id;
    // new systems start with default prices (no custom override)
    const sys = { id: genId(), name, pricesByPeriod: {} };
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
    const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
    const eff = getEffectivePrices(branch, sys, pid);
    qs('#system-name').value = sys.name || '';
    qs('#price-1p').value = formatPrice(eff.p1);
    qs('#price-2p').value = formatPrice(eff.p2);
    qs('#price-3p').value = formatPrice(eff.p3);
    qs('#price-4p').value = formatPrice(eff.p4);
    qs('#price-birthday').value = formatPrice(eff.birthday);
    qs('#price-film').value = formatPrice(eff.film);
    // adjust modal currency labels to مازاد تومان
    try { setSystemModalCurrencyLabels && setSystemModalCurrencyLabels(); } catch {}
    form.dataset.branchId = branchId;
    form.dataset.systemId = systemId;
    form.dataset.periodId = pid;
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
    const periodId = form.dataset.periodId;
    sys.name = qs('#system-name').value.trim() || sys.name;
    // Validate non-empty and parse
    const values = [ '#price-1p', '#price-2p', '#price-3p', '#price-4p', '#price-birthday', '#price-film' ]
      .map(sel => qs(sel).value.trim());
    if (values.some(v => v === '')) { (qs('#system-form-msg').textContent = 'Ù‡Ù…Ù‡ Ù‚ÛŒÙ…Øªâ€ŒÙ‡Ø§ Ø§Ù„Ø²Ø§Ù…ÛŒ Ù‡Ø³ØªÙ†Ø¯'); return; }
    const toNum = (v) => { const n = parseInt(String(v).replace(/,/g,''), 10); return isNaN(n) ? 0 : n; };
    const newPrices = {
      p1: toNum(qs('#price-1p').value),
      p2: toNum(qs('#price-2p').value),
      p3: toNum(qs('#price-3p').value),
      p4: toNum(qs('#price-4p').value),
      birthday: toNum(qs('#price-birthday').value),
      film: toNum(qs('#price-film').value)
    };
    // If equal to selected period default, clear override
    const def = (ensureBranchPeriods(branch).periods.find(p => p.id === periodId)?.defaultPrices) || zeroPrices();
    sys.pricesByPeriod = sys.pricesByPeriod || {};
    if (pricesEqual(newPrices, def)) { delete sys.pricesByPeriod[periodId]; } else { sys.pricesByPeriod[periodId] = newPrices; }
    saveBranches(branches);
    closeSystemModal();
    if (currentBranchId === branch.id) renderSystemsTable(branch);
  });

  // Initialize on switching to branches tab
  qsa('.nav-item').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'branches') {
      setTimeout(() => setTitle('تنظیمات شعب'), 0);
      renderBranchSubnav();
      showManageView();
    }
  }));

  // ---------- Default prices logic ----------
  const zeroPrices = () => ({ p1: 0, p2: 0, p3: 0, p4: 0, birthday: 0, film: 0 });
  const formatPrice = (n) => (Number.isFinite(n) ? n : 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const parsePrice = (s) => { const n = parseInt(String(s||'').replace(/,/g,''), 10); return isNaN(n) ? 0 : n; };
  const pricesEqual = (a,b) => ['p1','p2','p3','p4','birthday','film'].every(k => Number(a[k]||0) === Number(b[k]||0));
  // Currency label helpers: switch Ø±ÛŒØ§Ù„ to مازاد تومان
  function setLabelCurrencyByInputId(id, unit){
    const input = qs('#'+id);
    if (!input) return;
    const label = input.previousElementSibling;
    if (label && label.tagName && label.tagName.toLowerCase()==='span'){
      const base = String(label.textContent||'').replace(/\(.*\)/,'').trim();
      label.textContent = base + ' ('+unit+')';
    }
  }
  function setDefaultPricesCurrencyLabels(){
    setLabelCurrencyByInputId('def-1p','تومان / ساعت');
    setLabelCurrencyByInputId('def-2p','تومان / ساعت');
    setLabelCurrencyByInputId('def-3p','تومان / ساعت');
    setLabelCurrencyByInputId('def-4p','تومان / ساعت');
    setLabelCurrencyByInputId('def-birthday','مازاد تومان');
    setLabelCurrencyByInputId('def-film','مازاد تومان');
  }
  function setSystemModalCurrencyLabels(){
    setLabelCurrencyByInputId('price-1p','تومان / ساعت');
    setLabelCurrencyByInputId('price-2p','تومان / ساعت');
    setLabelCurrencyByInputId('price-3p','تومان / ساعت');
    setLabelCurrencyByInputId('price-4p','تومان / ساعت');
    setLabelCurrencyByInputId('price-birthday','مازاد تومان');
    setLabelCurrencyByInputId('price-film','مازاد تومان');
  }
  const getEffectivePrices = (branch, sys, periodId) => {
    ensureBranchPeriods(branch);
    const def = branch.periods.find(p => p.id === periodId)?.defaultPrices || zeroPrices();
    const ov = sys.pricesByPeriod && sys.pricesByPeriod[periodId];
    return ov ? ov : def;
  };

  const fillDefaultPricesForm = (branch) => {
    ensureBranchPeriods(branch);
    if (!currentPeriodId) currentPeriodId = branch.periods[0]?.id || null;
    const d = branch.periods.find(p => p.id === currentPeriodId)?.defaultPrices || zeroPrices();
    const map = { 'def-1p': d.p1, 'def-2p': d.p2, 'def-3p': d.p3, 'def-4p': d.p4, 'def-birthday': d.birthday, 'def-film': d.film };
    Object.entries(map).forEach(([id,val]) => { const el = qs('#'+id); if (el) el.value = formatPrice(val); });
  };

  const branchPageInit = () => {
    const branch = branches.find(b => b.id === currentBranchId);
    if (!branch) return;
    renderPeriodSelect(branch);
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
    (function(){
      ensureBranchPeriods(branch);
      const pid = currentPeriodId || branch.periods[0]?.id;
      const pp = branch.periods.find(p => p.id === pid);
      if (pp) pp.defaultPrices = d;
    })();
    saveBranches(branches);
    const msg = qs('#default-prices-msg');
    if (msg) { msg.textContent = 'قیمت های پیشفرض ذخیره شدند'; setTimeout(() => msg.textContent = '', 1500); }
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
    if (!selected.length) { alert('Ù‡ÛŒÚ† Ø³ÛŒØ³ØªÙ…ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª'); return; }
    const targetPrices = {
      p1: parsePrice(qs('#bulk-1p').value),
      p2: parsePrice(qs('#bulk-2p').value),
      p3: parsePrice(qs('#bulk-3p').value),
      p4: parsePrice(qs('#bulk-4p').value),
      birthday: parsePrice(qs('#bulk-birthday').value),
      film: parsePrice(qs('#bulk-film').value)
    };
    const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
    const effs = selected.map(id => getEffectivePrices(branch, branch.systems.find(s => s.id === id), pid));
    const allSame = effs.every(p => pricesEqual(p, effs[0]));
    if (!allSame) {
      const ok = confirm('Ø³ÛŒØ³ØªÙ… Ù‡Ø§ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ø´Ø¯Ù‡ Ø¯Ø§Ø±Ø§ÛŒ Ù‚ÛŒÙ…Øª / Ú©Ø§Ø±Ø¨Ø±ÛŒ Ù…ØªÙØ§ÙˆØªÛŒ Ù…ÛŒ Ø¨Ø§Ø´Ù†Ø¯ Ø§Ú¯Ø± Ø§Ø² ØªØºÛŒÛŒØ±Ø§Øª Ù…Ø·Ù…Ø¦Ù† Ù‡Ø³ØªÛŒØ¯ Ø«Ø¨Øª Ú©Ù†ÛŒØ¯');
      if (!ok) return;
    }
    // Apply change; if equals default, store null to mark as default
    selected.forEach(id => {
      const sys = branch.systems.find(s => s.id === id);
      if (!sys) return;
      const def = branch.periods.find(p => p.id === pid)?.defaultPrices || zeroPrices();
      sys.pricesByPeriod = sys.pricesByPeriod || {};
      if (pricesEqual(targetPrices, def)) delete sys.pricesByPeriod[pid]; else sys.pricesByPeriod[pid] = targetPrices;
    });
    saveBranches(branches);
    renderSystemsTable(branch);
  });

  // When entering a branch page, also fill defaults/prices, so hook into showBranchPage calls
  const originalShowBranchPage = showBranchPage;
  // Override by wrapping existing function if accessible
  // If not accessible due to scoping, call branchPageInit in the places we navigate
  // Call on initial manage->branch switch via click handlers below
  
  // ---- Period select + modal ----
  function renderPeriodSelect(branch){
    ensureBranchPeriods(branch);
    const sel = qs('#period-select');
    if (!sel) return;
    sel.innerHTML = '';
    branch.periods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${('0'+Math.floor(p.start/60)).slice(-2)}:${('0'+(p.start%60)).slice(-2)} - ${('0'+Math.floor(p.end/60)).slice(-2)}:${('0'+(p.end%60)).slice(-2)}`;
      sel.appendChild(opt);
    });
    if (!currentPeriodId) currentPeriodId = branch.periods[0]?.id || null;
    sel.value = currentPeriodId || branch.periods[0]?.id || '';
    sel.onchange = () => {
      currentPeriodId = sel.value;
      fillDefaultPricesForm(branch);
      renderSystemsTable(branch);
    };
    const btn = qs('#manage-periods');
    if (btn){ btn.onclick = () => openPeriodsModalTimeline(branch.id); }
  }

  function openPeriodsModal(branchId){
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    ensureBranchPeriods(branch);
    const m = qs('#periods-modal');
    const list = qs('#periods-list');
    if (!m || !list) return;
    list.innerHTML = '';
    function addRow(start, end){
      const row = document.createElement('div');
      row.className = 'period-row';
      row.innerHTML = `
        <label class="field"><span>Ø´Ø±ÙˆØ¹</span><input type="time" class="p-start" required /></label>
        <label class="field"><span>Ù¾Ø§ÛŒØ§Ù†</span><input type="time" class="p-end" required /></label>
        <button type="button" class="btn p-remove">Ã—</button>`;
      row.querySelector('.p-start').value = `${('0'+Math.floor(start/60)).slice(-2)}:${('0'+(start%60)).slice(-2)}`;
      row.querySelector('.p-end').value = `${('0'+Math.floor(end/60)).slice(-2)}:${('0'+(end%60)).slice(-2)}`;
      row.querySelector('.p-remove').onclick = () => { row.remove(); };
      list.appendChild(row);
    }
    branch.periods.forEach(p => addRow(p.start, p.end));
    const addEl = qs('#add-period');
    if (addEl) addEl.onclick = () => {
      const rows = list.querySelectorAll('.period-row');
      if (rows.length >= 5) return;
      let start = 0;
      if (rows.length){
        const last = rows[rows.length-1];
        const s = last.querySelector('.p-end').value.split(':');
        start = (parseInt(s[0],10)||0)*60 + (parseInt(s[1],10)||0);
      }
      addRow(start, 24*60);
    };
    const cancelEl = qs('#periods-cancel');
    if (cancelEl) cancelEl.onclick = () => { m.classList.add('hidden'); };
    const saveEl = qs('#periods-save');
    if (saveEl) saveEl.onclick = () => {
      const rows = [...list.querySelectorAll('.period-row')];
      const msg = qs('#periods-msg'); if (msg) msg.textContent='';
      if (rows.length < 1 || rows.length > 5){ if (msg) msg.textContent='ØªØ¹Ø¯Ø§Ø¯ Ø¨Ø§Ø²Ù‡ Ø¨Ø§ÛŒØ¯ Ø¨ÛŒÙ† Û± ØªØ§ Ûµ Ø¨Ø§Ø´Ø¯.'; return; }
      const items = rows.map(r => {
        const s = r.querySelector('.p-start').value.split(':'), e = r.querySelector('.p-end').value.split(':');
        const st = (parseInt(s[0],10)||0)*60 + (parseInt(s[1],10)||0);
        const en = (parseInt(e[0],10)||0)*60 + (parseInt(e[1],10)||0);
        return { start: st, end: en };
      });
      for (const it of items){ if (!(it.start < it.end)) { if (msg) msg.textContent='Ù‡Ø± Ø¨Ø§Ø²Ù‡ Ø¨Ø§ÛŒØ¯ Ø´Ø±ÙˆØ¹ Ú©Ù…ØªØ± Ø§Ø² Ù¾Ø§ÛŒØ§Ù† Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯.'; return; } }
      items.sort((a,b)=> a.start-b.start);
      if (items[0].start !== 0){ if (msg) msg.textContent='Ø¨Ø§Ø²Ù‡ Ø§ÙˆÙ„ Ø¨Ø§ÛŒØ¯ Ø§Ø² 00:00 Ø´Ø±ÙˆØ¹ Ø´ÙˆØ¯.'; return; }
      for (let i=1;i<items.length;i++){
        if (items[i-1].end !== items[i].start){ if (msg) msg.textContent='Ø¨Ø§Ø²Ù‡â€ŒÙ‡Ø§ Ø¨Ø§ÛŒØ¯ Ù¾Ø´Øªâ€ŒØ³Ø±Ù‡Ù… Ùˆ Ø¨Ø¯ÙˆÙ† ÙØ§ØµÙ„Ù‡ Ø¨Ø§Ø´Ù†Ø¯.'; return; }
      }
      if (items[items.length-1].end !== 24*60){ if (msg) msg.textContent='Ø¢Ø®Ø±ÛŒÙ† Ø¨Ø§Ø²Ù‡ Ø¨Ø§ÛŒØ¯ Ø¯Ø± 24:00 Ù¾Ø§ÛŒØ§Ù† ÛŒØ§Ø¨Ø¯.'; return; }
      // Map new items to old periods to preserve prices
      const oldPeriods = [...(branch.periods||[])];
      const prevPid = currentPeriodId;
      const mapped = items.map(it => {
        const mid = Math.floor((it.start + it.end) / 2);
        let src = oldPeriods.find(op => op.start <= mid && op.end > mid);
        if (!src){
          let best = oldPeriods[0], bestLen = -1;
          for (const op of oldPeriods){
            const ov = Math.max(0, Math.min(op.end, it.end) - Math.max(op.start, it.start));
            if (ov > bestLen){ bestLen = ov; best = op; }
          }
          src = best;
        }
        return { id: genId(), start: it.start, end: it.end, defaultPrices: (src && src.defaultPrices) ? src.defaultPrices : zeroPrices(), _src: src ? src.id : null };
      });
      // Commit new periods without helper field
      branch.periods = mapped.map(({_src, ...rest}) => rest);
      (branch.systems||[]).forEach(s => {
        const oldMap = s.pricesByPeriod || {};
        const newMap = {};
        mapped.forEach(np => { if (np._src && oldMap[np._src]) newMap[np.id] = oldMap[np._src]; });
        s.pricesByPeriod = newMap;
        delete s.prices;
      });
      saveBranches(branches);
      const keep = mapped.find(np => np._src === prevPid);
      currentPeriodId = (keep && keep.id) || branch.periods[0]?.id || null;
      renderPeriodSelect(branch);
      fillDefaultPricesForm(branch);
      renderSystemsTable(branch);
      m.classList.add('hidden');
    };
    m.classList.remove('hidden');
  }

  // New timeline-based periods editor
  function openPeriodsModalTimeline(branchId){
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    ensureBranchPeriods(branch);
    const m = qs('#periods-modal');
    if (!m) return;
    const list = qs('#periods-list');
    if (list) { list.innerHTML = ''; list.classList.add('hidden'); }

    // Build local boundaries from existing periods
    const ps = [...(branch.periods||[])].sort((a,b)=> a.start-b.start);
    let boundaries = [0];
    ps.forEach(p => boundaries.push(Math.max(0, Math.min(DAY_MIN, Number(p.end)||0))));
    boundaries[0] = 0;
    boundaries[boundaries.length-1] = DAY_MIN;

    // Inject timeline container if missing
    let tl = qs('#periods-timeline', m);
    if (!tl){
      tl = document.createElement('div');
      tl.id = 'periods-timeline';
      tl.className = 'timeline';
      tl.innerHTML = '<div class="timeline-scale"></div><div class="timeline-track"></div>';
      const formEl = m.querySelector('.form');
      if (formEl) formEl.insertBefore(tl, formEl.lastElementChild);
    }
    const scaleEl = tl.querySelector('.timeline-scale');
    const trackEl = tl.querySelector('.timeline-track');

    const renderScale = () => {
      if (!scaleEl) return;
      scaleEl.innerHTML = '';
      for (let h=0; h<=24; h+=2){
        const pct = (h/24)*100;
        const tick = document.createElement('div');
        tick.className = 'tick';
        tick.style.left = pct + '%';
        scaleEl.appendChild(tick);
        const lab = document.createElement('div');
        lab.className = 'label';
        lab.style.left = pct + '%';
        lab.textContent = String(h).padStart(2,'0') + ':00';
        scaleEl.appendChild(lab);
      }
    };

    const minutesToPct = (min) => (Math.max(0, Math.min(DAY_MIN, min))/DAY_MIN)*100;
    const pctToMinutes = (pct) => Math.round((pct/100)*DAY_MIN);

    let dragging = null; // { index, rect }
    let highlightPair = null; // [startHandleIndex, endHandleIndex]

    const render = () => {
      renderScale();
      if (!trackEl) return;
      trackEl.innerHTML = '';
      // segments
      for (let i=0; i<boundaries.length-1; i++){
        const start = boundaries[i], end = boundaries[i+1];
        const seg = document.createElement('div');
        seg.className = 'timeline-segment' + (i % 2 === 1 ? ' alt' : '');
        seg.style.left = minutesToPct(start) + '%';
        seg.style.width = (minutesToPct(end) - minutesToPct(start)) + '%';
        const label = document.createElement('div');
        label.textContent = `${toHHMM(start)} - ${toHHMM(end)}`;
        seg.appendChild(label);
        if (boundaries.length > 2){
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'seg-del'; del.textContent = 'Ã—';
          del.title = 'حذف بازه زمانی';
          del.onclick = (ev) => { ev.stopPropagation(); removeSegment(i); };
          seg.appendChild(del);
        }
        trackEl.appendChild(seg);
      }
      // handles
      for (let i=0; i<boundaries.length; i++){
        const isLocked = (i === 0 || i === boundaries.length-1);
        const h = document.createElement('div');
        h.className = 'timeline-handle' + (isLocked ? ' locked' : '');
        if (highlightPair && (i === highlightPair[0] || i === highlightPair[1])) h.classList.add('new');
        h.style.left = minutesToPct(boundaries[i]) + '%';
        if (!isLocked){ h.addEventListener('pointerdown', (e) => startDrag(e, i)); }
        trackEl.appendChild(h);
      }
    };

    function removeSegment(segIndex){
      if (boundaries.length <= 2) return;
      if (segIndex === 0) boundaries.splice(1,1); else boundaries.splice(segIndex,1);
      highlightPair = null;
      render();
    }

    function startDrag(e, idx){
      e.preventDefault();
      const rect = trackEl.getBoundingClientRect();
      dragging = { index: idx, rect };
      try { trackEl.setPointerCapture(e.pointerId); } catch {}
      window.addEventListener('pointermove', onDrag);
      window.addEventListener('pointerup', endDrag, { once: true });
    }
    function onDrag(e){
      if (!dragging) return;
      const { index, rect } = dragging;
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      // clamp within neighbors with 5min gap
      const minPct = minutesToPct(boundaries[index-1] + 5);
      const maxPct = minutesToPct(boundaries[index+1] - 5);
      pct = Math.max(minPct, Math.min(maxPct, pct));
      let min = pctToMinutes(pct);
      min = Math.round(min/5)*5;
      min = Math.max(boundaries[index-1]+5, Math.min(boundaries[index+1]-5, min));
      boundaries[index] = min;
      highlightPair = null;
      render();
    }
    function endDrag(){
      window.removeEventListener('pointermove', onDrag);
      dragging = null;
    }

    function addPeriod(){
      if ((boundaries.length-1) >= 5) return;
      let bestI = 0, bestLen = -1;
      for (let i=0; i<boundaries.length-1; i++){
        const len = boundaries[i+1]-boundaries[i];
        if (len > bestLen){ bestLen = len; bestI = i; }
      }
      const mid = boundaries[bestI] + Math.floor((boundaries[bestI+1]-boundaries[bestI])/2);
      boundaries.splice(bestI+1, 0, mid);
      highlightPair = [bestI+1, bestI+2];
      render();
    }

    const cancelEl = qs('#periods-cancel');
    if (cancelEl) cancelEl.onclick = () => { m.classList.add('hidden'); };
    const addEl = qs('#add-period');
    if (addEl) addEl.onclick = addPeriod;
    const saveEl = qs('#periods-save');
    if (saveEl) saveEl.onclick = () => {
      const oldPeriods = [...(branch.periods||[])];
      const prevPid = currentPeriodId;
      const mapped = [];
      for (let i=0; i<boundaries.length-1; i++){
        const start = boundaries[i], end = boundaries[i+1];
        const mid = Math.floor((start + end) / 2);
        let src = oldPeriods.find(op => op.start <= mid && op.end > mid);
        if (!src){
          let best = oldPeriods[0], bestLen = -1;
          for (const op of oldPeriods){
            const ov = Math.max(0, Math.min(op.end, end) - Math.max(op.start, start));
            if (ov > bestLen){ bestLen = ov; best = op; }
          }
          src = best;
        }
        mapped.push({ id: genId(), start, end, defaultPrices: (src && src.defaultPrices) ? src.defaultPrices : zeroPrices(), _src: src ? src.id : null });
      }
      (branch.systems||[]).forEach(s => {
        const oldMap = s.pricesByPeriod || {};
        const newMap = {};
        mapped.forEach(np => { if (np._src && oldMap[np._src]) newMap[np.id] = oldMap[np._src]; });
        s.pricesByPeriod = newMap;
        delete s.prices;
      });
      branch.periods = mapped.map(({_src, ...rest}) => rest);
      saveBranches(branches);
      const keep = mapped.find(np => np._src === prevPid);
      currentPeriodId = (keep && keep.id) || branch.periods[0]?.id || null;
      renderPeriodSelect(branch);
      fillDefaultPricesForm(branch);
      renderSystemsTable(branch);
      m.classList.add('hidden');
    };
    render();
    m.classList.remove('hidden');
  }
  // ---------- Confirm Modal + Undo Toast + Bulk override ----------
  let lastUndo = null; // { type, payload, branchId?, index }
  let toastTimer = null;
  function openConfirm(message, onConfirm){
    const m = qs('#confirm-modal');
    if (!m) { if (confirm(message)) onConfirm && onConfirm(); return; }
    const msg = qs('#confirm-message'); if (msg) msg.textContent = message || '';
    m.classList.remove('hidden');
    const cancel = qs('#confirm-cancel');
    const ok = qs('#confirm-ok');
    const cleanup = () => { if (ok) ok.onclick = null; if (cancel) cancel.onclick = null; m.classList.add('hidden'); };
    if (cancel) cancel.onclick = cleanup;
    if (ok) ok.onclick = () => { cleanup(); onConfirm && onConfirm(); };
  }

  function showUndoToast(info){
    // Override: clean Persian toast with explicit Undo button
    lastUndo = info;
    const toastOverride = qs('#undo-toast');
    if (toastOverride){
      const name = info?.payload?.name || '';
      let text = '';
      if (info.type === 'branch') text = `حذف شعبه «${name}» انجام شد.`;
      else if (info.type === 'system') text = `حذف سیستم «${name}» انجام شد.`;
      else if (info.type === 'buffet') text = `حذف آیتم بوفه «${name}» انجام شد.`;
      else if (info.type === 'kitchen') text = `حذف آیتم آشپزخانه «${name}» انجام شد.`;
      else if (info.type === 'special') text = `حذف آیتم ویژه «${name}» انجام شد.`;
      const action = 'بازگردانی';
      toastOverride.innerHTML = `${text} <button id="undo-action" class="link" type="button">${action}</button>`;
      toastOverride.classList.remove('leaving');
      toastOverride.classList.remove('hidden');
      if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
      const btn = qs('#undo-action');
      if (btn) btn.onclick = (e) => { e.stopPropagation && e.stopPropagation(); performUndo(); };
      toastTimer = setTimeout(() => { hideUndoToast(); }, 5000);
      return; // skip old implementation below
    }
    lastUndo = info;
    const toast = qs('#undo-toast');
    if (!toast) return;
    const text = (info.type === 'branch') ? `Ø´Ø¹Ø¨Ù‡ Â«${info.payload?.name || ''}Â» حذف Ø´Ø¯ â€” Ø¨Ø±Ø§ÛŒ Ø¨Ø§Ø²Ú¯Ø±Ø¯Ø§Ù†ÛŒ Ú©Ù„ÛŒÚ© Ú©Ù†ÛŒØ¯ ÛŒØ§ Ctrl+Z` : `Ø³ÛŒØ³ØªÙ… Â«${info.payload?.name || ''}Â» حذف Ø´Ø¯ â€” Ø¨Ø±Ø§ÛŒ Ø¨Ø§Ø²Ú¯Ø±Ø¯Ø§Ù†ÛŒ Ú©Ù„ÛŒÚ© Ú©Ù†ÛŒØ¯ ÛŒØ§ Ctrl+Z`;
    toast.textContent = text;
    toast.classList.remove('leaving');
    toast.classList.remove('hidden');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    toastTimer = setTimeout(() => { hideUndoToast(); }, 3000);
  }
  function hideUndoToast(){
    const t = qs('#undo-toast');
    if (!t) return;
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    if (t.classList.contains('hidden')) return;
    t.classList.add('leaving');
    const onEnd = () => {
      t.removeEventListener('animationend', onEnd);
      t.classList.add('hidden');
      t.classList.remove('leaving');
    };
    t.addEventListener('animationend', onEnd);
  }
  // Localized undo toast override for clean Persian text
  function showUndoToast(info){
    lastUndo = info;
    const toast = qs('#undo-toast');
    if (!toast) return;
    const name = (info && info.payload && info.payload.name) ? info.payload.name : '';
    let text = '';
    if (info.type === 'branch') text = `«${name}» حذف شد.`;
    else if (info.type === 'system') text = `سیستم «${name}» حذف شد.`;
    else if (info.type === 'buffet') text = `آیتم بوفه «${name}» حذف شد.`;
    else if (info.type === 'kitchen') text = `آیتم آشپزخانه «${name}» حذف شد.`;
    else if (info.type === 'special') text = `خدمات ویژه «${name}» حذف شد.`;
    else text = `«${name}» حذف شد.`;
    toast.innerHTML = `${text} <button id="undo-action" class="link" type="button">بازگردانی</button>`;
    toast.classList.remove('leaving'); toast.classList.remove('hidden');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    const btn = qs('#undo-action'); if (btn) btn.onclick = function(e){ if (e && e.stopPropagation) e.stopPropagation(); performUndo(); };
    toastTimer = setTimeout(function(){ hideUndoToast(); }, 5000);
  }
  function performUndo(){
    if (!lastUndo) return;
    if (lastUndo.type === 'branch'){
      const idx = Math.max(0, Number(lastUndo.index)||0);
      branches.splice(idx, 0, lastUndo.payload);
      saveBranches(branches);
      renderBranchesTable();
    } else if (lastUndo.type === 'system'){
      const br = branches.find(b => b.id === lastUndo.branchId);
      if (br){
        br.systems = br.systems || [];
        const idx = Math.max(0, Number(lastUndo.index)||0);
        br.systems.splice(idx, 0, lastUndo.payload);
        saveBranches(branches);
        if (currentBranchId === br.id) renderSystemsTable(br);
      }
    } else if (lastUndo.type === 'buffet'){
      const br = branches.find(b => b.id === lastUndo.branchId);
      if (br){ ensureBranchExtras(br); const idx = Math.max(0, Number(lastUndo.index)||0); br.buffetItems.splice(idx,0,lastUndo.payload); saveBranches(branches); if (currentBranchId === br.id) renderBuffet(br); }
    } else if (lastUndo.type === 'kitchen'){
      const br = branches.find(b => b.id === lastUndo.branchId);
      if (br){ ensureBranchExtras(br); const idx = Math.max(0, Number(lastUndo.index)||0); br.kitchenItems.splice(idx,0,lastUndo.payload); saveBranches(branches); if (currentBranchId === br.id) renderKitchen(br); }
    } else if (lastUndo.type === 'special'){
      const br = branches.find(b => b.id === lastUndo.branchId);
      if (br){ ensureBranchExtras(br); const idx = Math.max(0, Number(lastUndo.index)||0); br.specialItems.splice(idx,0,lastUndo.payload); saveBranches(branches); if (currentBranchId === br.id) renderSpecial(br); }
    }
    lastUndo = null; hideUndoToast();
  }
  document.addEventListener('click', (e) => { const t = e.target; if (t && t.id === 'undo-toast'){ performUndo(); } });
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')){ performUndo(); } });

  // Override toast popup for system deletion (clean Persian message + Ctrl+Z hint)
  function showUndoToast(info){
    lastUndo = info;
    const toast = qs('#undo-toast');
    if (!toast) return;
    const name = info?.payload?.name || '';
    let text = '';
    if (info.type === 'system') text = `سیستم «${name}» حذف شد — برای بازگردانی دکمه زیر را بزنید یا Ctrl+Z.`;
    else if (info.type === 'branch') text = `«${name}» حذف شد.`;
    else if (info.type === 'buffet') text = `آیتم بوفه «${name}» حذف شد.`;
    else if (info.type === 'kitchen') text = `آیتم آشپزخانه «${name}» حذف شد.`;
    else if (info.type === 'special') text = `آیتم ویژه «${name}» حذف شد.`;
    else text = `«${name}» حذف شد.`;
    toast.innerHTML = `${text} <button id="undo-action" class="link" type="button">واگردانی</button> <span class="hint">یا Ctrl+Z</span>`;
    toast.classList.remove('leaving'); toast.classList.remove('hidden');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    const btn = qs('#undo-action');
    if (btn) btn.onclick = function(e){ if (e && e.stopPropagation) e.stopPropagation(); performUndo(); };
    toastTimer = setTimeout(function(){ hideUndoToast(); }, 5000);
  }

  // --- Final override: simplify undo toast (no button) ---
  function showUndoToast(info){
    lastUndo = info;
    const toast = qs('#undo-toast');
    if (!toast) return;
    const name = info?.payload?.name || '';
    let text = '';
    if (info.type === 'system') text = `سیستم «${name}» حذف شد — برای بازگردانی Ctrl+Z را بزنید.`;
    else if (info.type === 'branch') text = `«${name}» حذف شد — بازگردانی با Ctrl+Z.`;
    else if (info.type === 'buffet') text = `آیتم بوفه «${name}» حذف شد — Ctrl+Z.`;
    else if (info.type === 'kitchen') text = `آیتم آشپزخانه «${name}» حذف شد — Ctrl+Z.`;
    else if (info.type === 'special') text = `آیتم ویژه «${name}» حذف شد — Ctrl+Z.`;
    else text = `«${name}» حذف شد — Ctrl+Z.`;
    toast.textContent = text;
    toast.classList.remove('leaving'); toast.classList.remove('hidden');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    toastTimer = setTimeout(function(){ hideUndoToast(); }, 5000);
  }

  // Capture Ctrl/Cmd+Z robustly (works over overlays)
  window.addEventListener('keydown', function(e){
    const isUndoCombo = (e.ctrlKey || e.metaKey) && (e.code === 'KeyZ' || (typeof e.key === 'string' && e.key.toLowerCase() === 'z'));
    if (isUndoCombo && lastUndo){
      e.preventDefault(); if (e.stopPropagation) e.stopPropagation();
      performUndo();
    }
  }, true);

  function setupBulkFormOverride(){
    const form = qs('#bulk-form');
    if (!form || form.__customHandlerAttached) return;
    const clone = form.cloneNode(true);
    form.parentNode.replaceChild(clone, form);
    clone.__customHandlerAttached = true;
  clone.addEventListener('submit', (e) => {
      e.preventDefault();
      const branch = branches.find(b => b.id === currentBranchId);
      if (!branch) return;
      const bulkMsg = qs('#bulk-msg'); if (bulkMsg) { bulkMsg.textContent = ''; bulkMsg.classList.add('hidden'); }
      const selected = qsa('#systems-body .row-select:checked').map(ch => ch.dataset.id);
      if (!selected.length){ if (bulkMsg){ bulkMsg.textContent = 'Ù‡ÛŒÚ† Ø³ÛŒØ³ØªÙ…ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª'; bulkMsg.classList.remove('hidden'); } return; }
      const targetPrices = {
        p1: parsePrice(qs('#bulk-1p').value),
        p2: parsePrice(qs('#bulk-2p').value),
        p3: parsePrice(qs('#bulk-3p').value),
        p4: parsePrice(qs('#bulk-4p').value),
        birthday: parsePrice(qs('#bulk-birthday').value),
        film: parsePrice(qs('#bulk-film').value)
      };
      const pid = currentPeriodId || (ensureBranchPeriods(branch).periods[0]?.id);
      const effs = selected.map(id => getEffectivePrices(branch, branch.systems.find(s => s.id === id), pid));
      const allSame = effs.every(p => pricesEqual(p, effs[0]));
      if (!allSame){ if (bulkMsg){ bulkMsg.textContent = 'Ø³ÛŒØ³ØªÙ…â€ŒÙ‡Ø§ÛŒ Ø§Ù†ØªØ®Ø§Ø¨ Ø´Ø¯Ù‡ Ø¯Ø§Ø±Ø§ÛŒ Ù‚ÛŒÙ…Øª/Ú©Ø§Ø±Ø¨Ø±ÛŒ Ù…ØªÙØ§ÙˆØªÛŒ Ù‡Ø³ØªÙ†Ø¯. Ø§Ø¨ØªØ¯Ø§ Ø¢Ù†Ù‡Ø§ Ø±Ø§ ÛŒÚ©Ø³Ø§Ù†â€ŒØ³Ø§Ø²ÛŒ Ú©Ù†ÛŒØ¯ ÛŒØ§ Ø¢Ú¯Ø§Ù‡Ø§Ù†Ù‡ Ø§Ù‚Ø¯Ø§Ù… Ø±Ø§ ØªÚ©Ø±Ø§Ø± Ú©Ù†ÛŒØ¯.'; bulkMsg.classList.remove('hidden'); } return; }
      selected.forEach(id => {
        const sys = branch.systems.find(s => s.id === id);
        if (!sys) return;
        const def = branch.periods.find(p => p.id === pid)?.defaultPrices || zeroPrices();
        sys.pricesByPeriod = sys.pricesByPeriod || {};
        if (pricesEqual(targetPrices, def)) delete sys.pricesByPeriod[pid]; else sys.pricesByPeriod[pid] = targetPrices;
      });
      saveBranches(branches);
      renderSystemsTable(branch);
    });
  }
  // Attach overrides once at load
  setupBulkFormOverride();

  // -------- Branch inner tabs (systems/buffet/kitchen/special) --------
  function setBranchInnerTab(key){
    currentBranchInnerTab = key;
    qsa('#branch-top-tabs .branch-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.branchTab === key));
    const ids = ['general','systems','buffet','kitchen','special','tech'];
    ids.forEach(k => { const sec = qs('#branch-tab-'+k); if (sec) sec.classList.toggle('hidden', k !== key); });
  }
  const __tabs = qs('#branch-top-tabs');
  if (__tabs){
    __tabs.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('.branch-tab-btn[data-branch-tab]')) setBranchInnerTab(t.getAttribute('data-branch-tab'));
    });
  }

  // ---------- Buffet (categories + items) ----------
  function renderBuffetCategories(branch){
    ensureBranchExtras(branch);
    const sel = qs('#buffet-item-cat');
    if (sel){
      sel.innerHTML = '';
      const optNone = document.createElement('option'); optNone.value = ''; optNone.textContent = '-- بدون دسته بندی --'; sel.appendChild(optNone);
      (branch.buffetCategories||[]).forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o); });
    }
  }
  function renderBuffet(branch){
    ensureBranchExtras(branch);
    renderBuffetCategories(branch);
    const tbody = qs('#buffet-items-body'); if (!tbody) return; tbody.innerHTML = '';
    (branch.buffetItems||[]).forEach(item => {
      const tr = document.createElement('tr');
      const priceText = (Number(item.price)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const catSel = document.createElement('select'); catSel.setAttribute('data-buffet-item', item.id);
      const none = document.createElement('option'); none.value=''; none.textContent='-- بدون دسته بندی --'; catSel.appendChild(none);
      (branch.buffetCategories||[]).forEach(c => { const o = document.createElement('option'); o.value=c.id; o.textContent=c.name; catSel.appendChild(o); });
      catSel.value = item.categoryId || '';
      tr.innerHTML = `<td>${item.name||''}</td><td class="price-cell" data-type="buffet" data-id="${item.id}">${priceText}</td>`;
      const ctd = document.createElement('td'); ctd.appendChild(catSel); tr.appendChild(ctd);
      const act = document.createElement('td'); const del = document.createElement('button'); del.type='button'; del.className='btn danger'; del.textContent='حذف'; del.setAttribute('data-del-buffet', item.id); act.appendChild(del); tr.appendChild(act);
      tbody.appendChild(tr);
    });
  }
  document.addEventListener('submit', (e) => {
    const t = e.target;
    if (t && t.id === 'buffet-cat-form'){
      e.preventDefault(); const name = (qs('#buffet-cat-name')?.value || '').trim(); if (!name) return;
      const br = branches.find(b => b.id === currentBranchId); if (!br) return; ensureBranchExtras(br);
      br.buffetCategories.push({ id: genId(), name }); saveBranches(branches); qs('#buffet-cat-name').value=''; renderBuffet(br);
    }
    if (t && t.id === 'kitchen-item-form'){
      e.preventDefault(); const name=(qs('#kitchen-item-name')?.value||'').trim(); const price=parsePrice(qs('#kitchen-item-price')?.value||''); if (!name) return;
      const br = branches.find(b => b.id === currentBranchId); if (!br) return; ensureBranchExtras(br);
      br.kitchenItems.push({ id: genId(), name, price }); saveBranches(branches); qs('#kitchen-item-name').value=''; qs('#kitchen-item-price').value=''; renderKitchen(br);
    }
    if (t && t.id === 'special-item-form'){
      e.preventDefault(); const name=(qs('#special-item-name')?.value||'').trim(); const price=parsePrice(qs('#special-item-price')?.value||''); if (!name) return;
      const br = branches.find(b => b.id === currentBranchId); if (!br) return; ensureBranchExtras(br);
      br.specialItems.push({ id: genId(), name, price }); saveBranches(branches); qs('#special-item-name').value=''; qs('#special-item-price').value=''; renderSpecial(br);
    }
  });

  // Persist tech settings (per branch)
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.id === 'printer-system-key'){
      const br = branches.find(b => b.id === currentBranchId);
      if (!br) return;
      ensureBranchExtras(br);
      br.printerSystemKey = String(t.value || '');
      saveBranches(branches);
    }
  });
  // --- General tab (name, address, phones, employees) ---
  function ensureGeneralTabElements(){
    const tabs = qs('#branch-top-tabs');
    if (tabs && !tabs.querySelector('[data-branch-tab="general"]')){
      const btn = document.createElement('button');
      btn.className = 'branch-tab-btn';
      btn.setAttribute('data-branch-tab','general');
      btn.textContent = 'تنظیمات عمومی';
      tabs.insertBefore(btn, tabs.firstChild || null);
    }
    let sec = qs('#branch-tab-general');
    const sysSec = qs('#branch-tab-systems');
    if (!sec){
      sec = document.createElement('div');
      sec.id = 'branch-tab-general';
      sec.className = 'branch-tab-section';
      if (sysSec && sysSec.parentNode){ sysSec.parentNode.insertBefore(sec, sysSec); }
      else { const bpv = qs('#branch-page-view'); bpv && bpv.insertBefore(sec, bpv.firstChild || null); }
      sec.innerHTML = `
        <div class="card">
          <h3>تنظیمات عمومی شعبه</h3>
          <form id="branch-general-form" class="form grid">
            <label class="field full">
              <span>نام شعبه</span>
              <input id="branch-general-name" type="text" required />
            </label>
            <label class="field full">
              <span>آدرس شعبه</span>
              <input id="branch-address" type="text" placeholder="نشانی دقیق شعبه" />
            </label>
            <label class="field">
              <span>شماره تماس ۱</span>
              <input id="branch-phone1" type="text" inputmode="numeric" pattern="^\\d{11}$" placeholder="09xxxxxxxxx" />
            </label>
            <label class="field">
              <span>شماره تماس ۲</span>
              <input id="branch-phone2" type="text" inputmode="numeric" pattern="^\\d{11}$" placeholder="اختیاری" />
            </label>
            <label class="field full">
              <span>کارکنان شعبه</span>
              <select id="branch-employees" multiple size="5"></select>
              <small class="hint">برای انتخاب چند کاربر، کلید Ctrl یا ⌘ را نگه دارید.</small>
            </label>
            <div class="field full">
              <button type="submit" class="btn primary">ذخیره تنظیمات</button>
            </div>
            <p id="branch-general-msg" class="hint full"></p>
          </form>
        </div>`;
    }
  }

  // Ensure employees card exists under General tab
  function ensureEmployeesCard(){
    const sec = qs('#branch-tab-general');
    if (!sec) return;
    if (qs('#branch-employees-card')) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'branch-employees-card';
    card.innerHTML = `
      <div class="table-header">
        <h3>لیست کارمندان شعبه</h3>
        <form id="employee-add-form" class="form" style="grid-auto-flow: column; align-items:center; grid-auto-columns: max-content; gap:8px;">
          <input id="employee-search" type="search" placeholder="جستجوی کاربران list="employee-suggest" />
          <datalist id="employee-suggest"></datalist>
          <button type="submit" class="btn primary">اضافه کردن کاربر به کارمندان شعبه</button>
        </form>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>کارمندان</th>
              <th>O'U.OO�U�</th>
              <th>O�U+O,UOU.OO�</th>
            </tr>
          </thead>
          <tbody id="employees-body"></tbody>
        </table>
      </div>`;
    sec.appendChild(card);
    // Visual spacing and header/controls adjustments
    try {
      card.style.marginTop = '16px';
      const titleEl = card.querySelector('h3');
      if (titleEl) titleEl.textContent = 'لیست کارمندان شعبه';
      const header = card.querySelector('.table-header');
      const oldForm = card.querySelector('#employee-add-form');
      if (oldForm && header){
        const wrapper = document.createElement('div');
        wrapper.className = 'form';
        wrapper.style.cssText = 'grid-auto-flow: column; align-items:center; grid-auto-columns: max-content; gap:8px;';
        const openBtn = document.createElement('button');
        openBtn.type = 'button'; openBtn.id = 'open-employee-search'; openBtn.className = 'btn'; openBtn.textContent = 'جستجوی کاربران';
        wrapper.appendChild(openBtn);
        header.replaceChild(wrapper, oldForm);
      }
      // Set employees table header labels (clean Persian)
      try {
        const ths2 = card.querySelectorAll('thead th');
        if (ths2 && ths2.length >= 3){
          ths2[0].textContent = 'نام و نام خانوادگی';
          ths2[1].textContent = 'شماره تماس';
          ths2[2].textContent = 'عملیات';
        }
      } catch {}
      const ths = card.querySelectorAll('thead th');
      if (ths && ths.length >= 3){
        ths[0].textContent = 'نام و نام خانوادگی';
        ths[1].textContent = 'شماره همراه';
        ths[2].textContent = 'عملیات ها';
      }
      // ensure modal and open handler
      try { ensureEmployeeSearchModal(); } catch {}
      card.querySelector('#open-employee-search')?.addEventListener('click', () => document.getElementById('employee-search-modal')?.classList.remove('hidden'));
    } catch {}
  }

  // helpers for users datasource and labels
  function getAllSystemUsers(){
    try { if (typeof loadUsers === 'function') return loadUsers(); } catch {}
    try { if (Array.isArray(USER_DB)) return USER_DB; } catch {}
    return [];
  }
  function userLabel(u){
    const full = [u.first, u.last].filter(Boolean).join(' ').trim();
    const name = full || u.name || '';
    const phone = u.phone || '';
    return [name, phone].filter(Boolean).join(' - ');
  }
  function userId(u){ return u.id || u.phone || u.email || u.name || ''; }

  function renderEmployeesTable(branch){
    const tbody = qs('#employees-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const all = getAllSystemUsers();
    const byId = new Map(all.map(u => [String(userId(u)), u]));
    (branch.employees||[]).map(String).forEach(id => {
      const u = byId.get(id);
      const tr = document.createElement('tr');
      const name = u ? userLabel(u).split(' - ')[0] : id;
      const phone = u ? (u.phone || '') : '';
      tr.innerHTML = `<td>${name}</td><td>${phone}</td>`;
      const act = document.createElement('td');
      // add roles button before delete
      const rolesBtn = document.createElement('button');
      rolesBtn.type = 'button'; rolesBtn.className = 'btn'; rolesBtn.textContent = 'نقش ها';
      rolesBtn.setAttribute('data-roles-emp', id);
      act.appendChild(rolesBtn);
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'btn danger'; del.textContent = 'حذف کاربر';
      del.setAttribute('data-del-emp', id);
      act.appendChild(del); tr.appendChild(act);
      tbody.appendChild(tr);
    });
  }

  function renderBranchGeneral(branch){
    ensureBranchExtras(branch);
    const nameEl = qs('#branch-general-name');
    const addrEl = qs('#branch-address');
    const p1El = qs('#branch-phone1');
    const p2El = qs('#branch-phone2');
    if (!nameEl || !addrEl || !p1El || !p2El) return;
    nameEl.value = branch.name || '';
    addrEl.value = branch.address || '';
    p1El.value = branch.phone1 || '';
    p2El.value = branch.phone2 || '';
    // Hide old employees selector if present and render new employees UI
    try { const oldSel = qs('#branch-employees'); const lbl = oldSel && oldSel.closest('label'); if (lbl) lbl.style.display = 'none'; } catch {}
    ensureEmployeesCard();
    const dl = qs('#employee-suggest');
    if (dl){
      dl.innerHTML = '';
      const users = getAllSystemUsers();
      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = userLabel(u);
        opt.setAttribute('data-id', String(userId(u)));
        dl.appendChild(opt);
      });
    }
    renderEmployeesTable(branch);
    // Populate employees from USER_DB if available
    try {
      const users = (typeof USER_DB !== 'undefined' && Array.isArray(USER_DB)) ? USER_DB : [];
      const selected = new Set((branch.employees||[]).map(String));
      empSel.innerHTML = '';
      users.forEach(u => {
        const id = String(u.phone || u.email || u.name || '');
        if (!id) return;
        const opt = document.createElement('option');
        opt.value = id;
        const label = [u.name, u.phone].filter(Boolean).join(' — ');
        opt.textContent = label || id;
        opt.selected = selected.has(id);
        empSel.appendChild(opt);
      });
    } catch {}
    const msg = qs('#branch-general-msg'); if (msg) msg.textContent='';
  }

  document.addEventListener('submit', (e) => {
    const t = e.target;
    if (t && t.id === 'branch-general-form'){
      e.preventDefault();
      const br = branches.find(b => b.id === currentBranchId);
      if (!br) return;
      ensureBranchExtras(br);
      const oldName = br.name;
      const name = (qs('#branch-general-name')?.value || '').trim();
      const addr = (qs('#branch-address')?.value || '').trim();
      const phone1 = (qs('#branch-phone1')?.value || '').trim();
      const phone2 = (qs('#branch-phone2')?.value || '').trim();
      const empSel = qs('#branch-employees');
      const employees = empSel ? [...empSel.selectedOptions].map(o => o.value) : [];
      if (name) br.name = name;
      br.address = addr;
      br.phone1 = phone1;
      br.phone2 = phone2;
      // br.employees is managed via the Employees card UI
      saveBranches(branches);
      // Update UI parts that show branch name
      if (oldName !== br.name){
        renderBranchSubnav();
        const tEl = qs('#branch-page-title'); if (tEl) tEl.textContent = `O'O1O"U� ${br.name}`;
      }
      const msg = qs('#branch-general-msg'); if (msg){ msg.textContent = 'تنظیمات با موفقیت ذخیره شد.'; setTimeout(()=>{ msg.textContent=''; }, 1500); }
    }
  });
  // Add employee via search form
  document.addEventListener('submit', (e) => {
    const t = e.target;
    if (t && t.id === 'employee-add-form'){
      e.preventDefault();
      const br = branches.find(b => b.id === currentBranchId);
      if (!br) return; ensureBranchExtras(br);
      const input = qs('#employee-search');
      const val = (input?.value || '').trim(); if (!val) return;
      const users = getAllSystemUsers();
      let sel = users.find(u => userLabel(u) === val);
      if (!sel){ sel = users.find(u => (u.phone || '') && val.includes(u.phone)); }
      if (!sel) return;
      const id = String(userId(sel));
      br.employees = Array.isArray(br.employees) ? br.employees : [];
      if (!br.employees.map(String).includes(id)){
        br.employees.push(id);
        saveBranches(branches);
        renderEmployeesTable(br);
      }
      if (input) input.value = '';
    }
  });
  // Remove employee from list
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.matches('button[data-del-emp]')){
      const id = t.getAttribute('data-del-emp');
      const br = branches.find(b => b.id === currentBranchId);
      if (!br) return; ensureBranchExtras(br);
      const i = (br.employees||[]).map(String).indexOf(String(id));
      if (i >= 0){
        const removed = br.employees.splice(i,1)[0];
        saveBranches(branches);
        renderEmployeesTable(br);
        try { showUndoToast({ type: 'employee', payload: removed, branchId: br.id, index: i }); } catch {}
      }
    }
    if (t && t.matches('button[data-roles-emp]')){
      const id = t.getAttribute('data-roles-emp');
      if (!id) return;
      openEmployeeRolesModal(id);
    }
  });
  // Save button for tech settings
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.id === 'printer-settings-save'){
      const br = branches.find(b => b.id === currentBranchId);
      if (!br) return;
      ensureBranchExtras(br);
      const keyInput = qs('#printer-system-key');
      br.printerSystemKey = String(keyInput?.value || '');
      saveBranches(branches);
      const toast = qs('#undo-toast');
      if (toast){
        lastUndo = null;
        toast.textContent = 'تنظیمات فنی ذخیره شد.';
        toast.classList.remove('leaving');
        toast.classList.remove('hidden');
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
        toastTimer = setTimeout(() => { hideUndoToast(); }, 2000);
      }
    }
  });
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.id === 'buffet-item-add'){
      const name=(qs('#buffet-item-name')?.value||'').trim(); const price=parsePrice(qs('#buffet-item-price')?.value||''); const cat=qs('#buffet-item-cat')?.value||''; if (!name) return;
      const br = branches.find(b => b.id === currentBranchId); if (!br) return; ensureBranchExtras(br);
      br.buffetItems.push({ id: genId(), name, price, categoryId: cat || null }); saveBranches(branches); qs('#buffet-item-name').value=''; qs('#buffet-item-price').value=''; renderBuffet(br);
    }
    if (t && t.matches('button[data-del-buffet]')){
      const id=t.getAttribute('data-del-buffet'); const br=branches.find(b=>b.id===currentBranchId); if (!br) return; ensureBranchExtras(br);
      const i=br.buffetItems.findIndex(x=>x.id===id); if(i>=0){
        const item = br.buffetItems[i];
        openConfirm(`حذف «${item.name || ''}»؟ این عملیات قابل بازگشت است.`, () => {
          br.buffetItems.splice(i,1); saveBranches(branches); renderBuffet(br);
          showUndoToast({ type: 'buffet', payload: item, branchId: br.id, index: i });
        });
      } }
    if (t && t.matches('button[data-del-kitchen]')){
      const id=t.getAttribute('data-del-kitchen'); const br=branches.find(b=>b.id===currentBranchId); if (!br) return; ensureBranchExtras(br);
      const i=br.kitchenItems.findIndex(x=>x.id===id); if(i>=0){
        const item = br.kitchenItems[i];
        openConfirm(`حذف «${item.name || ''}»؟ این عملیات قابل بازگشت است.`, () => {
          br.kitchenItems.splice(i,1); saveBranches(branches); renderKitchen(br);
          showUndoToast({ type: 'kitchen', payload: item, branchId: br.id, index: i });
        });
      } }
    if (t && t.matches('button[data-del-special]')){
      const id=t.getAttribute('data-del-special'); const br=branches.find(b=>b.id===currentBranchId); if (!br) return; ensureBranchExtras(br);
      const i=br.specialItems.findIndex(x=>x.id===id); if(i>=0){
        const item = br.specialItems[i];
        openConfirm(`حذف «${item.name || ''}»؟ این عملیات قابل بازگشت است.`, () => {
          br.specialItems.splice(i,1); saveBranches(branches); renderSpecial(br);
          showUndoToast({ type: 'special', payload: item, branchId: br.id, index: i });
        });
      } }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.matches('select[data-buffet-item]')){
      const id=t.getAttribute('data-buffet-item'); const br=branches.find(b=>b.id===currentBranchId); if (!br) return; ensureBranchExtras(br);
      const it=br.buffetItems.find(x=>x.id===id); if (it){ it.categoryId = t.value || null; saveBranches(branches); }
    }
  });
  // inline edit price on click for buffet/kitchen/special price cells
  document.addEventListener('click', (e) => {
    const td = e.target && e.target.closest && e.target.closest('td.price-cell');
    if (!td) return;
    if (td.querySelector('input')) return;
    const id = td.getAttribute('data-id');
    const typ = td.getAttribute('data-type');
    const oldText = (td.textContent||'').trim();
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'price-input'; input.value = oldText;
    td.innerHTML = ''; td.appendChild(input); input.focus(); input.select();
    const commit = (save) => {
      const br = branches.find(b => b.id === currentBranchId); if (!br) return; ensureBranchExtras(br);
      if (save){
        const val = parsePrice(input.value);
        if (typ === 'buffet'){ const it=(br.buffetItems||[]).find(x=>x.id===id); if (it) it.price=val; renderBuffet(br); }
        if (typ === 'kitchen'){ const it=(br.kitchenItems||[]).find(x=>x.id===id); if (it) it.price=val; renderKitchen(br); }
        if (typ === 'special'){ const it=(br.specialItems||[]).find(x=>x.id===id); if (it) it.price=val; renderSpecial(br); }
        saveBranches(branches);
      } else { td.textContent = oldText; }
    };
    input.addEventListener('keydown', (ev) => { if (ev.key==='Enter'){ ev.preventDefault(); commit(true); } if (ev.key==='Escape'){ ev.preventDefault(); commit(false); } });
    input.addEventListener('blur', () => commit(true));
  });

  function renderKitchen(branch){
    ensureBranchExtras(branch);
    const tbody = qs('#kitchen-items-body'); if (!tbody) return; tbody.innerHTML = '';
    (branch.kitchenItems||[]).forEach(item => {
      const tr = document.createElement('tr'); const priceText=(Number(item.price)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      tr.innerHTML = `<td>${item.name||''}</td><td class="price-cell" data-type="kitchen" data-id="${item.id}">${priceText}</td>`;
      const act = document.createElement('td'); const del=document.createElement('button'); del.type='button'; del.className='btn danger'; del.textContent='حذف'; del.setAttribute('data-del-kitchen', item.id); act.appendChild(del); tr.appendChild(act);
      tbody.appendChild(tr);
    });
  }
  function renderSpecial(branch){
    ensureBranchExtras(branch);
    const tbody = qs('#special-items-body'); if (!tbody) return; tbody.innerHTML = '';
    (branch.specialItems||[]).forEach(item => {
      const tr = document.createElement('tr'); const priceText=(Number(item.price)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      tr.innerHTML = `<td>${item.name||''}</td><td class="price-cell" data-type="special" data-id="${item.id}">${priceText}</td>`;
      const act = document.createElement('td'); const del=document.createElement('button'); del.type='button'; del.className='btn danger'; del.textContent='حذف'; del.setAttribute('data-del-special', item.id); act.appendChild(del); tr.appendChild(act);
      tbody.appendChild(tr);
    });
  }

  // --- Employee search modal ---
  function ensureEmployeeSearchModal(){
    if (qs('#employee-search-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'employee-search-modal';
    modal.className = 'modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `
      <div class="modal-card">
        <h3>جستجوی کاربران</h3>
        <form id="employee-add-form" class="form">
          <label class="field full">
            <span>نام یا شماره همراه</span>
            <input id="employee-search" type="search" placeholder="جستجوی کاربران" list="employee-suggest" />
            <datalist id="employee-suggest"></datalist>
          </label>
          <div class="modal-actions">
            <button type="button" class="btn" id="employee-search-cancel">انصراف</button>
            <button type="submit" class="btn primary">افزودن به کارمندان شعبه</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    qs('#employee-search-cancel')?.addEventListener('click', () => qs('#employee-search-modal')?.classList.add('hidden'));
  }

  // --- Employee Roles modal ---
  const BRANCH_ROLE_OPTIONS = [
    'مدیر شعبه',
    'صندوق دار',
    'مسئول آشپزخانه',
    'مسئول خرید',
    'کارمند عادی'
  ];
  let CURRENT_ROLE_EMP = null;
  function ensureEmployeeRolesModal(){
    if (qs('#employee-roles-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'employee-roles-modal';
    modal.className = 'modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `
      <div class="modal-card">
        <h3>نقش های کارمند</h3>
        <div class="form">
          <label class="field full">
            <span>انتخاب نقش ها</span>
            <select id="employee-roles-select" multiple size="5"></select>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="employee-roles-cancel">انصراف</button>
          <button type="button" class="btn primary" id="employee-roles-save">ذخیره</button>
        </div>
        <p id="employee-roles-msg" class="hint"></p>
      </div>`;
    document.body.appendChild(modal);
    const sel = modal.querySelector('#employee-roles-select');
    if (sel){ BRANCH_ROLE_OPTIONS.forEach(r => { const o = document.createElement('option'); o.value = r; o.textContent = r; sel.appendChild(o); }); }
    qs('#employee-roles-cancel')?.addEventListener('click', () => qs('#employee-roles-modal')?.classList.add('hidden'));
    qs('#employee-roles-save')?.addEventListener('click', saveEmployeeRolesFromModal);
  }

  function openEmployeeRolesModal(empId){
    ensureEmployeeRolesModal();
    CURRENT_ROLE_EMP = String(empId);
    const br = branches.find(b => b.id === currentBranchId);
    if (!br) return;
    ensureBranchExtras(br);
    br.employeeRoles = (br.employeeRoles && typeof br.employeeRoles === 'object') ? br.employeeRoles : {};
    const selected = new Set(Array.isArray(br.employeeRoles[CURRENT_ROLE_EMP]) ? br.employeeRoles[CURRENT_ROLE_EMP].map(String) : []);
    const sel = qs('#employee-roles-select');
    if (sel){ [...sel.options].forEach(o => { o.selected = selected.has(o.value); }); }
    qs('#employee-roles-modal')?.classList.remove('hidden');
  }

  function saveEmployeeRolesFromModal(){
    if (!CURRENT_ROLE_EMP) return;
    const br = branches.find(b => b.id === currentBranchId);
    if (!br) return;
    ensureBranchExtras(br);
    br.employeeRoles = (br.employeeRoles && typeof br.employeeRoles === 'object') ? br.employeeRoles : {};
    const sel = qs('#employee-roles-select');
    const roles = sel ? [...sel.options].filter(o => o.selected).map(o => o.value) : [];
    br.employeeRoles[CURRENT_ROLE_EMP] = roles;
    saveBranches(branches);
    qs('#employee-roles-modal')?.classList.add('hidden');
    const msg = qs('#employee-roles-msg'); if (msg){ msg.textContent = 'ذخیره شد'; setTimeout(() => { msg.textContent=''; }, 1200); }
  }
});
