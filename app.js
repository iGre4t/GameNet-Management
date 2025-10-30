const AUTH_KEY = "gamenet_auth";
const PASS_KEY = "gamenet_admin_password";
const CURRENT_USER_KEY = 'gamenet_current_user_id';

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
    try { renderUserPill(); } catch {}
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
      try { localStorage.setItem(CURRENT_USER_KEY, 'admin'); } catch {}
      err.textContent = '';
      setView(true);
      setActiveTab('home');
      try { renderUserPill(); } catch {}
    } else {
      err.textContent = 'ورود ناموفق بود. لطفا اطلاعات را بررسی کنید.';
    }
  });

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
    const dateFa = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone: tz }).format(now);
    el.innerHTML = `<span class="time">${time}</span><span class="date">${dateFa}</span>`;
  }
  renderClock();
  setInterval(renderClock, 1000);
  try { renderUserPill(); } catch {}

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

// --- Developer settings (tab) + favicon cropper injection ---
(function(){
  const SITE_TITLE_KEY = 'gamenet_site_title';
  const FAVICON_KEY = 'gamenet_favicon_data';
  const TIMEZONE_KEY = 'gamenet_timezone';
  const TIME_OFFSET_KEY = 'gamenet_time_offset_min'; // kept for backward compatibility

  const U = (s) => s;
  const STR_DEVELOPER_SETTINGS = "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u062A\u0648\u0633\u0639\u0647 \u062F\u0647\u0646\u062F\u0647";
  const STR_SITE_TITLE = "\u0639\u0646\u0648\u0627\u0646 \u0633\u0627\u06CC\u062A";
  const STR_FAVICON = "\u0641\u0627\u0648\u0622\u06CC\u06A9\u0648\u0646 \u0633\u0627\u06CC\u062A";
  const STR_SET_CHANGE_FAVICON = "\u062A\u0646\u0638\u06CC\u0645/\u062A\u063A\u06CC\u06CC\u0631 \u0641\u0627\u0648\u0622\u06CC\u06A9\u0648\u0646";
  const STR_PICK_IMAGE = "\u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u0635\u0648\u06CC\u0631";
  const STR_ZOOM = "\u0628\u0632\u0631\u06AF\u0646\u0645\u0627\u06CC\u06CC";
  const STR_CANCEL = "\u0627\u0646\u0635\u0631\u0627\u0641";
  const STR_SAVE = "\u0630\u062E\u06CC\u0631\u0647";
  const STR_TIMEZONE = "اختلاف ساعت محلی";

  function ensureStyles(){
    if (document.getElementById('dev-styles')) return;
    const style = document.createElement('style');
    style.id = 'dev-styles';
    style.textContent = `
    .favicon-icon{width:20px;height:20px;border-radius:4px;object-fit:contain;background:transparent}
    .favicon-row{display:flex;align-items:center;gap:10px}
    .cropper-wrap{width:100%;max-width:256px;aspect-ratio:1/1;border:1px solid var(--border);border-radius:12px;overflow:hidden;display:grid;place-items:center;background:#f8f8f8}
    #favicon-canvas{width:100%;height:auto;display:block}
    `;
    document.head.appendChild(style);
  }

  function ensureSidebarFavicon(){
    const hdr = document.querySelector('.sidebar-header');
    if (!hdr) return null;
    let img = document.getElementById('sidebar-favicon');
    if (!img){
      img = document.createElement('img');
      img.id = 'sidebar-favicon';
      img.className = 'favicon-icon hidden';
      img.alt = 'favicon';
      const title = hdr.querySelector('.title');
      hdr.insertBefore(img, title || null);
    }
    return img;
  }

  function getFaviconLink(){
    let link = document.querySelector('link[rel="icon"]');
    if (!link){
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    return link;
  }

  function applyTitle(title){
    const t = title || '';
    const sdTitle = document.querySelector('.sidebar .title');
    if (sdTitle) sdTitle.textContent = t || sdTitle.textContent;
    if (t) document.title = t;
    const input = document.getElementById('site-title');
    if (input && input.value !== t) input.value = t;
  }

  function applyFavicon(dataUrl){
    const link = getFaviconLink();
    const img = ensureSidebarFavicon();
    const preview = document.getElementById('favicon-preview');
    if (dataUrl){
      link.href = dataUrl;
      if (img){ img.src = dataUrl; img.classList.remove('hidden'); }
      if (preview){ preview.src = dataUrl; preview.classList.remove('hidden'); }
    } else {
      link.href = 'data:,';
      if (img){ img.src = ''; img.classList.add('hidden'); }
      if (preview){ preview.src = ''; preview.classList.add('hidden'); }
    }
  }

  function injectDevTab(){
    const nav = document.querySelector('.nav');
    if (nav && !nav.querySelector('[data-tab="dev"]')){
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.setAttribute('data-tab','dev');
      const span = document.createElement('span');
      span.textContent = STR_DEVELOPER_SETTINGS;
      btn.appendChild(span);
      btn.addEventListener('click', () => {
        if (typeof setActiveTab === 'function') setActiveTab('dev');
        const el = document.getElementById('page-title');
        if (el) el.textContent = STR_DEVELOPER_SETTINGS;
      });
      nav.appendChild(btn);
    }

    if (!document.getElementById('tab-dev')){
      const sec = document.createElement('section');
      sec.id = 'tab-dev';
      sec.className = 'tab';
      sec.innerHTML = `
        <div class="card">
          <h3>${STR_DEVELOPER_SETTINGS}</h3>
          <div class="form grid">
            <label class="field full">
              <span>${STR_SITE_TITLE}</span>
              <input id="site-title" type="text" value="" placeholder="\u0645\u062B\u0644\u0627\u064B: \u0645\u062F\u06CC\u0631\u06CC\u062A \u06AF\u06CC\u0645\u200C\u0646\u062A" />
            </label>
            <div class="field">
              <span>${STR_FAVICON}</span>
              <div class="favicon-row">
                <img id="favicon-preview" class="favicon-icon hidden" alt="favicon" />
                <button id="open-favicon-modal" class="btn">${STR_SET_CHANGE_FAVICON}</button>
              </div>
            </div>
            <label class="field">
              <span>${STR_TIMEZONE}</span>
              <select id="timezone-select"></select>
            </label>
          </div>
        </div>`;
      const content = document.querySelector('.content');
      if (content) content.appendChild(sec);
      // Add explicit save button and message
      const card = sec.querySelector('.card');
      if (card) {
        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        actions.innerHTML = '<button type=\"button\" class=\"btn primary\" id=\"dev-save\">'+STR_SAVE+'<\/button>';
        card.appendChild(actions);
        const msg = document.createElement('p');
        msg.id = 'dev-msg';
        msg.className = 'hint';
        card.appendChild(msg);
      }
      // Mark inputs with keys and set initial values
      const st = sec.querySelector('#site-title');
      if (st) st.setAttribute('data-save-key', 'gamenet_site_title');
      // Populate timezone dropdown
      const tzSelect = sec.querySelector('#timezone-select');
      if (tzSelect){
        const storedTz = localStorage.getItem(TIMEZONE_KEY) || 'Asia/Tehran';
        function supportedTimeZones(){
          if (typeof Intl !== 'undefined' && Intl.supportedValuesOf){
            try { return Intl.supportedValuesOf('timeZone'); } catch { /* fallthrough */ }
          }
          return [
            'Asia/Tehran','Asia/Dubai','Asia/Baghdad','Asia/Qatar','Asia/Kolkata','Asia/Tokyo','Asia/Shanghai',
            'Europe/Moscow','Europe/Berlin','Europe/Paris','Europe/London','UTC',
            'Africa/Cairo','Africa/Nairobi',
            'America/Sao_Paulo','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Pacific/Auckland'
          ];
        }
        function tzOffsetLabel(tz){
          try {
            const parts = new Intl.DateTimeFormat('en-US',{ timeZone: tz, timeZoneName:'shortOffset'}).formatToParts(new Date());
            const v = parts.find(p=>p.type==='timeZoneName')?.value || '';
            return v.startsWith('GMT')?v:('GMT'+v.replace('UTC',''));
          } catch { return 'GMT'; }
        }
        const zones = supportedTimeZones();
        // Sort by offset then name
        zones.sort((a,b)=>{
          const ao = tzOffsetLabel(a).replace('GMT','');
          const bo = tzOffsetLabel(b).replace('GMT','');
          return ao.localeCompare(bo) || a.localeCompare(b);
        });
        zones.forEach(z=>{
          const opt = document.createElement('option');
          const label = z.replace(/_/g,'/');
          opt.value = z;
          opt.textContent = `${label} (${tzOffsetLabel(z)})`;
          if (z === storedTz) opt.selected = true;
          tzSelect.appendChild(opt);
        });
      }
      // Save handler
      const saveBtn = sec.querySelector('#dev-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const titleVal = String((document.getElementById('site-title')||{}).value || '').trim();
          localStorage.setItem('gamenet_site_title', titleVal);
          if (typeof applyTitle === 'function') applyTitle(titleVal);
          const tzSel = document.getElementById('timezone-select');
          const tz = tzSel ? tzSel.value : 'Asia/Tehran';
          localStorage.setItem(TIMEZONE_KEY, tz);
          // Also keep offset minutes for backward compatibility
          try {
            const parts = new Intl.DateTimeFormat('en-US',{ timeZone: tz, timeZoneName:'shortOffset'}).formatToParts(new Date());
            const v = parts.find(p=>p.type==='timeZoneName')?.value || 'GMT+03:30';
            const m = v.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
            if (m){
              const sign = m[1] === '-' ? -1 : 1;
              const hh = parseInt(m[2],10); const mm = parseInt(m[3]||'0',10);
              const minutes = sign*(hh*60+mm);
              localStorage.setItem(TIME_OFFSET_KEY, String(minutes));
            }
          } catch {}
          const hint = document.getElementById('dev-msg');
          if (hint) { hint.textContent = '\u0630\u062E\u06CC\u0631\u0647 \u0634\u062F'; setTimeout(() => hint.textContent = '', 1500); }
          if (typeof renderClock === 'function') renderClock();
        });
      }
    }

    // Remove old site-title field from Settings tab if exists
    const oldTitleInput = document.querySelector('#tab-settings #site-title');
    if (oldTitleInput){
      const container = oldTitleInput.closest('.field');
      if (container) container.remove();
    }
  }

  function injectFaviconModal(){
    if (document.getElementById('favicon-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'favicon-modal';
    modal.className = 'modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `
      <div class="modal-card">
        <h3 id="favicon-modal-title">\u062A\u0646\u0638\u06CC\u0645 \u0641\u0627\u0648\u0622\u06CC\u06A9\u0648\u0646 (\u0628\u0631\u0634 1:1)</h3>
        <div class="form">
          <label class="field">
            <span>${STR_PICK_IMAGE}</span>
            <input type="file" id="favicon-file" accept="image/*" />
          </label>
          <div class="cropper-wrap">
            <canvas id="favicon-canvas" width="256" height="256" aria-label="\u0646\u0627\u062D\u06CC\u0647 \u0628\u0631\u0634"></canvas>
          </div>
          <label class="field">
            <span>${STR_ZOOM}</span>
            <input type="range" id="favicon-zoom" min="0.5" max="3" step="0.01" value="1" />
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="favicon-cancel">${STR_CANCEL}</button>
          <button type="button" class="btn primary" id="favicon-save">${STR_SAVE}</button>
        </div>
        <p id="favicon-msg" class="hint"></p>
      </div>`;
    document.body.appendChild(modal);
  }

  function initLogic(){
    ensureStyles();
    ensureSidebarFavicon();
    injectDevTab();
    injectFaviconModal();

    // Load persisted title and favicon
    const storedTitle = localStorage.getItem(SITE_TITLE_KEY);
    if (storedTitle) applyTitle(storedTitle);
    else {
      const def = document.querySelector('.sidebar .title')?.textContent?.trim() || '';
      if (def) applyTitle(def);
    }
    const fav = localStorage.getItem(FAVICON_KEY);
    if (fav) applyFavicon(fav);

    // Initialize time-offset input
    // Default timezone if missing
    if (!localStorage.getItem(TIMEZONE_KEY)) localStorage.setItem(TIMEZONE_KEY, 'Asia/Tehran');
    // Hook title input
    document.addEventListener('input', (e) => {
      const t = e.target;
      if (t && t.id === 'site-title'){
        const val = String(t.value || '').trim();
        localStorage.setItem(SITE_TITLE_KEY, val);
        applyTitle(val);
      }
    });
    // Timezone change
    document.addEventListener('change', (e)=>{
      const t = e.target;
      if (t && t.id === 'timezone-select'){
        const tz = t.value || 'Asia/Tehran';
        localStorage.setItem(TIMEZONE_KEY, tz);
        // also cache offset minutes for compatibility
        try {
          const parts = new Intl.DateTimeFormat('en-US',{ timeZone: tz, timeZoneName:'shortOffset'}).formatToParts(new Date());
          const v = parts.find(p=>p.type==='timeZoneName')?.value || '';
          const m = v.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
          if (m){
            const sign = m[1] === '-' ? -1 : 1;
            const hh = parseInt(m[2],10); const mm = parseInt(m[3]||'0',10);
            const minutes = sign*(hh*60+mm);
            localStorage.setItem(TIME_OFFSET_KEY, String(minutes));
          }
        } catch {}
        renderClock();
      }
    });

    // Favicon modal logic
    const openBtn = document.getElementById('open-favicon-modal');
    const modal = document.getElementById('favicon-modal');
    const fileInput = document.getElementById('favicon-file');
    const canvas = document.getElementById('favicon-canvas');
    const zoom = document.getElementById('favicon-zoom');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let img = new Image();
    let hasImage = false;
    let baseScale = 1;
    let scale = 1;
    let offsetX = 0, offsetY = 0;
    let dragging = false; let lastX = 0, lastY = 0;

    function clearCanvas(){ if (!ctx) return; ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
    function draw(){ if (!ctx || !hasImage) { clearCanvas(); return; } clearCanvas(); const w = img.width * scale; const h = img.height * scale; const x = (canvas.width - w)/2 + offsetX; const y = (canvas.height - h)/2 + offsetY; ctx.drawImage(img, x, y, w, h); }
    function fitImage(){ if (!img || !canvas) return; const s = Math.min(canvas.width / img.width, canvas.height / img.height); baseScale = s; scale = s; offsetX = 0; offsetY = 0; if (zoom) zoom.value = '1'; draw(); }

    function openModal(){ if (!modal) return; modal.classList.remove('hidden'); }
    function closeModal(){ if (!modal) return; modal.classList.add('hidden'); if (fileInput) fileInput.value=''; }

    if (openBtn) openBtn.addEventListener('click', openModal);
    document.getElementById('favicon-cancel')?.addEventListener('click', closeModal);
    document.getElementById('favicon-save')?.addEventListener('click', () => {
      if (!canvas) return; const out = document.createElement('canvas'); out.width = 64; out.height = 64; const octx = out.getContext('2d'); if (!octx) return; // draw scaled down from preview
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      const url = out.toDataURL('image/png');
      localStorage.setItem(FAVICON_KEY, url);
      applyFavicon(url);
      closeModal();
    });

    if (fileInput) fileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { img = new Image(); img.onload = () => { hasImage = true; fitImage(); }; img.src = reader.result; };
      reader.readAsDataURL(f);
    });

    if (zoom) zoom.addEventListener('input', () => { const z = parseFloat(zoom.value || '1'); scale = baseScale * z; draw(); });

    if (canvas){
      canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
      window.addEventListener('mousemove', (e) => { if (!dragging) return; offsetX += (e.clientX - lastX); offsetY += (e.clientY - lastY); lastX = e.clientX; lastY = e.clientY; draw(); });
      window.addEventListener('mouseup', () => { dragging = false; });
      canvas.addEventListener('mouseleave', () => { dragging = false; });
      // Prevent image drag ghost
      canvas.addEventListener('dragstart', (e)=> e.preventDefault());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLogic); else initLogic();
})();
// --- Users & Permissions: enhancements v2 ---
// Safe upgrades by extending/mutating instead of replacing top-level declarations
(() => {
  // Fix/mutate permission tabs to use requested labels and parts
  try {
    if (typeof PERMISSION_TABS === 'object') {
      PERMISSION_TABS.home = { label: 'خانه', parts: ['نمایش داشبورد'] };
      PERMISSION_TABS.users = { label: 'کاربران', parts: ['افزودن', 'ویرایش', 'حذف', 'دسترسی‌ها'] };
      PERMISSION_TABS.branches = { label: 'تنظیمات شعب', parts: ['مدیریت', 'قیمت پیش‌فرض', 'سیستم‌ها'] };
      PERMISSION_TABS.settings = { label: 'تنظیمات کاربری', parts: ['عنوان سایت', 'حریم خصوصی'] };
    }
  } catch {}

  const ARCHIVE_KEY = 'gamenet_users_archive';
  function loadArchivedUsers(){ try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); } catch { return []; } }
  function saveArchivedUsers(arr){ localStorage.setItem(ARCHIVE_KEY, JSON.stringify(arr)); }

  function nextSequentialCode(existing){
    let list = existing; try { if (!Array.isArray(list)) list = loadUsers(); } catch {}
    let max = 0;
    (list||[]).forEach(u => {
      if (u && !u.email && typeof u.code === 'string' && u.code !== '00000'){
        const n = parseInt(u.code, 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    });
    const next = Math.max(0, max) + 1;
    return String(next).padStart(5, '0');
  }

  const DAYS_FA = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
  function defaultWeeklySchedule(intervalCount){
    const n = (intervalCount === 4) ? 4 : 2;
    const emptyIntervals = (m) => Array.from({length:m}, (_,i) => ({ start: '09:00', end: i%2===0 ? '13:00' : '17:00' }));
    return { type: n, days: DAYS_FA.map((d, idx) => ({ day: idx, label: d, intervals: emptyIntervals(n) })) };
  }

  function getEffectivePermissions(){
    const u = getCurrentUser && getCurrentUser();
    if (!u) return { tabs:{}, parts:{} };
    if (u.id === 'admin' || u.type === 'manager') return { tabs: { home:true, users:true, branches:true, settings:true, dev:true }, parts: {} };
    const p = (u.permissions && typeof u.permissions==='object') ? u.permissions : {};
    return { tabs: p.tabs||{}, parts: p.parts||{} };
  }
  function applyPermissionsToNav(){
    const perms = getEffectivePermissions();
    qsa('.nav .nav-item').forEach(b => {
      const tab = b.getAttribute('data-tab');
      const allowed = (typeof perms.tabs[tab] === 'boolean') ? perms.tabs[tab] : true;
      b.style.display = allowed ? '' : 'none';
    });
  }
  function applyPermissionsToPage(){
    const perms = getEffectivePermissions();
    qsa('[data-perm-part]').forEach(el => {
      const key = el.getAttribute('data-perm-part')||'';
      const [tab, part] = key.split(':');
      const allowedTab = (typeof perms.tabs[tab] === 'boolean') ? perms.tabs[tab] : true;
      const allowedPart = Array.isArray(perms.parts[tab]) ? perms.parts[tab].includes(part) : true;
      el.style.display = (allowedTab && allowedPart) ? '' : 'none';
    });
  }

  // Override setActiveTab to also apply permissions and correct titles
  const _orig_setActiveTab = typeof setActiveTab === 'function' ? setActiveTab : null;
  window.setActiveTab = function(tab){
    if (_orig_setActiveTab) _orig_setActiveTab(tab); else {
      qsa('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      qsa('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
      const titles = { home: 'خانه', users: 'کاربران', branches: 'تنظیمات شعب', settings: 'تنظیمات کاربری', dev: 'تنظیمات توسعه دهنده' };
      const el = qs('#page-title'); if (el) el.textContent = titles[tab] || '';
    }
    try { applyPermissionsToPage(); } catch {}
  };

  // Override user modal open to inject type + schedule + sequential code
  const _orig_openUserModalX = typeof openUserModalX === 'function' ? openUserModalX : null;
  window.openUserModalX = function(id){
    // If modal exists but lacks fields, rebuild minimal structure
    const um = qs('#user-modal');
    if (um && !qs('#user-type')){
      const card = um.querySelector('.modal-card');
      if (card){
        card.innerHTML = `
          <h3 id="user-modal-title">افزودن کاربر</h3>
          <form id="user-form" class="form">
            <div class="grid full">
              <label class="field"><span>نام</span><input id="user-first" type="text" required /></label>
              <label class="field"><span>نام خانوادگی</span><input id="user-last" type="text" required /></label>
            </div>
            <div class="grid full">
              <label class="field"><span>شماره تماس (11 رقم)</span><input id="user-phone" type="text" inputmode="numeric" pattern="^\\d{11}$" placeholder="09xxxxxxxxx" required /></label>
              <label class="field"><span>کد ۵ رقمی</span><input id="user-code" type="text" inputmode="numeric" pattern="^\\d{5}$" readonly /></label>
            </div>
            <div class="grid full">
              <label class="field"><span>نقش کاربر</span><select id="user-type"><option value="manager">کاربر مدیر</option><option value="operator">متصدی</option></select></label>
              <div class="field" id="operator-tools" style="display:none;align-items:end;gap:8px;grid-auto-columns:max-content;grid-auto-flow:column;"><span>ساعت کاری (هفتگی)</span><button type="button" id="edit-schedule" class="btn">تنظیم برنامه</button></div>
            </div>
            <label class="field"><span>رمز عبور</span><input id="user-pass" type="password" minlength="4" placeholder="******" /></label>
            <div class="modal-actions"><button type="button" class="btn" id="user-cancel">انصراف</button><button type="submit" class="btn primary" id="user-save">ذخیره</button></div>
            <p id="user-form-msg" class="hint"></p>
          </form>`;
        qs('#user-cancel')?.addEventListener('click', () => qs('#user-modal')?.classList.add('hidden'));
        qs('#user-form')?.addEventListener('submit', onUserFormSubmitX);
        qs('#user-type')?.addEventListener('change', (e) => { const tools = qs('#operator-tools'); if (tools) tools.style.display = (e.target.value === 'operator') ? 'grid' : 'none'; });
        qs('#edit-schedule')?.addEventListener('click', () => openScheduleModal(id));
      }
    }
    const users = loadUsers();
    const isEdit = !!id; const title = qs('#user-modal-title'); if (title) title.textContent = isEdit ? 'ویرایش کاربر' : 'افزودن کاربر';
    const f = qs('#user-first'), l = qs('#user-last'), p = qs('#user-phone'), c = qs('#user-code'), pw = qs('#user-pass');
    const typeSel = qs('#user-type'); const tools = qs('#operator-tools'); if (tools) tools.style.display = 'none';
    const msg = qs('#user-form-msg'); if (msg) msg.textContent = '';
    if (isEdit){
      const u = users.find(x => x.id === id); if (!u) return;
      if (f) f.value = u.first || ''; if (l) l.value = u.last || ''; if (p) p.value = u.phone || '';
      if (c) c.value = u.code || ''; if (pw) pw.value = '';
      if (typeSel) typeSel.value = u.type || 'operator'; if (tools) tools.style.display = (u.type === 'operator') ? 'grid' : 'none';
    } else {
      if (f) f.value = ''; if (l) l.value = ''; if (p) p.value = '';
      if (c) c.value = nextSequentialCode(users); if (pw) pw.value = '';
      if (typeSel) typeSel.value = 'operator'; if (tools) tools.style.display = 'grid';
    }
    qs('#user-modal')?.classList.remove('hidden');
  };

  // Override submit to include type + schedule and validations
  const _orig_onUserFormSubmitX = typeof onUserFormSubmitX === 'function' ? onUserFormSubmitX : null;
  window.onUserFormSubmitX = function(e){
    e.preventDefault();
    const first = qs('#user-first')?.value?.trim() || '';
    const last = qs('#user-last')?.value?.trim() || '';
    const phone = qs('#user-phone')?.value?.trim() || '';
    const code = qs('#user-code')?.value?.trim() || '';
    const pass = qs('#user-pass')?.value || '';
    const type = qs('#user-type')?.value || 'operator';
    const msg = qs('#user-form-msg');
    if (!first || !last){ if (msg) msg.textContent = 'نام و نام خانوادگی الزامی است.'; return; }
    if (!/^\d{11}$/.test(phone)){ if (msg) msg.textContent = 'شماره تماس باید ۱۱ رقمی باشد.'; return; }
    if (!/^\d{5}$/.test(code)){ if (msg) msg.textContent = 'کد باید ۵ رقمی باشد.'; return; }
    const users = loadUsers();
    // editing?
    const editId = (typeof CURRENT_EDIT_USER !== 'undefined') ? CURRENT_EDIT_USER : null;
    if (editId){
      const i = users.findIndex(u => u.id === editId); if (i === -1) return;
      const old = users[i]; users[i] = { ...old, first, last, phone, type, password: pass ? pass : old.password };
    } else {
      const schedule = (type === 'operator') ? defaultWeeklySchedule(2) : null;
      users.push({ id: Math.random().toString(36).slice(2,10), code, first, last, phone, password: pass || '', active: true, email: '', type, schedule, permissions: { tabs: {}, parts: {} } });
    }
    saveUsers(users); renderUsers(); updateKpis(); qs('#user-modal')?.classList.add('hidden');
  };

  // Override renderUsers to show role + delete
  const _orig_renderUsers = typeof renderUsers === 'function' ? renderUsers : null;
  window.renderUsers = function(){
    const tbody = qs('#users-body'); if (!tbody) return; tbody.innerHTML = '';
    const headRow = qs('#tab-users thead tr'); if (headRow){ headRow.innerHTML = '<th>کد ۵ رقمی</th><th>نام و نام خانوادگی</th><th>شماره تماس</th><th>نقش</th><th>وضعیت</th><th>عملیات</th>'; }
    const users = loadUsers().filter(u => !u.email);
    users.forEach(u => {
      const tr = document.createElement('tr');
      const full = `${u.first || ''} ${u.last || ''}`.trim();
      const status = u.active ? 'فعال' : 'غیرفعال';
      const role = u.type === 'manager' ? 'کاربر مدیر' : 'متصدی';
      tr.innerHTML = `<td>${u.code || ''}</td><td>${full}</td><td>${u.phone || ''}</td><td>${role}</td><td>${status}</td><td>
        <button class="btn" data-act="edit" data-id="${u.id}">ویرایش</button>
        <button class="btn" data-act="perm" data-id="${u.id}">دسترسی‌ها</button>
        <button class="btn danger" data-act="del" data-id="${u.id}">حذف</button>
      </td>`; tbody.appendChild(tr);
    });
    qsa('#users-body button[data-act]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-id'); const act = b.getAttribute('data-act');
      if (act === 'edit') openUserModalX(id);
      if (act === 'perm') openPermModal(id);
      if (act === 'del') {
        const users = loadUsers(); const i = users.findIndex(u => u.id === id); if (i !== -1 && !users[i].email){
          const u = users[i]; if (!confirm(`حذف کاربر «${(u.first||'')+' '+(u.last||'')}»؟ سوابق آرشیو می‌شود.`)) return;
          const arch = loadArchivedUsers(); arch.push({ ...u, archivedAt: new Date().toISOString() }); saveArchivedUsers(arch);
          users.splice(i,1); saveUsers(users); renderUsers(); updateKpis();
        }
      }
    }));
  };

  // Schedule modal helpers
  function ensureScheduleModal(){ if (qs('#schedule-modal')) return; const modal = document.createElement('div'); modal.id='schedule-modal'; modal.className='modal hidden'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.innerHTML = `
    <div class="modal-card" style="max-width:760px;">
      <h3>تنظیم ساعت کاری (هفتگی)</h3>
      <div class="form">
        <label class="field"><span>تعداد بازه‌ها در هر روز</span><select id="sch-count"><option value="2">2 (یک شیفت کار + یک استراحت)</option><option value="4">4 (دو شیفت کار + دو استراحت)</option></select></label>
        <div id="sch-grid" class="grid full"></div>
      </div>
      <div class="modal-actions"><button type="button" class="btn" id="sch-cancel">انصراف</button><button type="button" class="btn primary" id="sch-save">ذخیره</button></div>
      <p id="sch-msg" class="hint"></p>
    </div>`; document.body.appendChild(modal); qs('#sch-cancel')?.addEventListener('click', () => qs('#schedule-modal')?.classList.add('hidden')); qs('#sch-save')?.addEventListener('click', saveScheduleFromModal); }
  function openScheduleModal(id){ ensureScheduleModal(); const users = loadUsers(); const u = users.find(x => x.id === (id || (typeof CURRENT_EDIT_USER !== 'undefined' ? CURRENT_EDIT_USER : ''))); if (!u) return; const sched = u.schedule || defaultWeeklySchedule(2); const countSel = qs('#sch-count'); if (countSel) countSel.value = String(sched.type || 2); renderScheduleGrid(sched); qs('#schedule-modal')?.classList.remove('hidden'); qs('#sch-count')?.addEventListener('change', (e) => { const n = parseInt(e.target.value, 10) === 4 ? 4 : 2; renderScheduleGrid({ type: n, days: defaultWeeklySchedule(n).days }); }, { once: true }); }
  function renderScheduleGrid(sched){ const grid = qs('#sch-grid'); if (!grid) return; grid.innerHTML=''; const n = (sched.type===4)?4:2; (sched.days||[]).forEach(day => { const row = document.createElement('div'); row.className='grid full'; const label = document.createElement('div'); label.className='field'; label.innerHTML = `<span>${day.label}</span>`; row.appendChild(label); for (let i=0;i<n;i++){ const cur = day.intervals?.[i] || { start:'09:00', end:'13:00' }; const startId = `sch-${day.day}-${i}-start`; const endId = `sch-${day.day}-${i}-end`; const f1 = document.createElement('label'); f1.className='field'; f1.innerHTML = `<span>شروع ${i+1}</span><input type="time" id="${startId}" value="${cur.start}" />`; const f2 = document.createElement('label'); f2.className='field'; f2.innerHTML = `<span>پایان ${i+1}</span><input type="time" id="${endId}" value="${cur.end}" />`; row.appendChild(f1); row.appendChild(f2);} grid.appendChild(row); }); }
  function saveScheduleFromModal(){ const users = loadUsers(); const id = (typeof CURRENT_EDIT_USER !== 'undefined') ? CURRENT_EDIT_USER : ''; const i = users.findIndex(u => u.id === id); if (i === -1) return; const n = parseInt(qs('#sch-count')?.value || '2', 10) === 4 ? 4 : 2; const days = DAYS_FA.map((d, idx) => { const intervals = []; for (let k=0;k<n;k++){ const s = qs(`#sch-${idx}-${k}-start`)?.value || '09:00'; const e = qs(`#sch-${idx}-${k}-end`)?.value || '13:00'; intervals.push({ start: s, end: e }); } return { day: idx, label: d, intervals }; }); users[i].schedule = { type: n, days }; saveUsers(users); qs('#schedule-modal')?.classList.add('hidden'); }

  // Add enhanced login for normal users (by phone or 5-digit code)
  document.addEventListener('DOMContentLoaded', () => {
    try { applyPermissionsToNav(); applyPermissionsToPage(); } catch {}
    // Rename settings in sidebar to "تنظیمات کاربری"
    try { const s = document.querySelector('.nav [data-tab="settings"] span'); if (s) s.textContent = 'تنظیمات کاربری'; } catch {}
    // Mark default prices form as a protected part under branches
    try { const f = document.getElementById('default-prices-form'); if (f) f.setAttribute('data-perm-part', 'branches:قیمت پیش‌فرض'); } catch {}
    const form = qs('#login-form');
    form?.addEventListener('submit', (e) => {
      if (localStorage.getItem(AUTH_KEY) === 'ok' && (localStorage.getItem(CURRENT_USER_KEY) === 'admin')) return;
      const user = qs('#username')?.value?.trim() || '';
      const pass = qs('#password')?.value || '';
      const err = qs('#login-error');
      const users = loadUsers();
      const found = users.find(u => (!u.email) && (u.phone === user || u.code === user));
      if (found && found.active && String(found.password || '') === pass){
        e.preventDefault();
        localStorage.setItem(AUTH_KEY, 'ok');
        try { localStorage.setItem(CURRENT_USER_KEY, found.id); } catch {}
        if (err) err.textContent = '';
        setView(true);
        setActiveTab('home');
        try { renderUserPill(); applyPermissionsToNav(); applyPermissionsToPage(); } catch {}
      }
    });
  });
})();
// --- Users & Permissions extensions ---
const USERS_KEY = 'gamenet_users';
const PERMISSION_TABS = {
  home: { label: 'خانه', parts: ['نمایش داشبورد'] },
  users: { label: 'کاربران', parts: ['مشاهده', 'افزودن', 'ویرایش', 'حذف', 'ویرایش مجوز'] },
  branches: { label: 'شعب', parts: ['مشاهده', 'افزودن/ویرایش سیستم', 'تعرفه'] },
  settings: { label: 'تنظیمات', parts: ['مشاهده', 'امنیت', 'ظاهر'] }
};

function loadUsers(){
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = [
    { id: 'admin', code: '00000', first: 'ادمین', last: 'سیستم', phone: '', password: '', active: true, email: 'admin@example.com', permissions: { tabs: {}, parts: {} } },
    { id: genId(), code: genCode([]), first: 'کاربر', last: 'یک', phone: '09123456789', password: '1234', active: true, email: '', permissions: { tabs: {}, parts: {} } }
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
function genCode(existing){
  const used = new Set(existing.map(u => u.code));
  for (let i=0;i<10000;i++){
    const c = Math.floor(Math.random()*100000).toString().padStart(5,'0');
    if (!used.has(c)) return c;
  }
  return (Date.now()%100000).toString().padStart(5,'0');
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
  if (headRow){ headRow.innerHTML = '<th>کد یکتا</th><th>نام و نام خانوادگی</th><th>تلفن/نام‌کاربری</th><th>وضعیت</th><th>اقدامات</th>'; }
  const users = loadUsers().filter(u => !u.email);
  users.forEach(u => {
    const tr = document.createElement('tr');
    const full = `${u.first || ''} ${u.last || ''}`.trim();
    const status = u.active ? 'فعال' : 'غیرفعال';
    tr.innerHTML = `<td>${u.code || ''}</td><td>${full}</td><td>${u.phone || ''}</td><td>${status}</td><td>
      <button class="btn" data-act="edit" data-id="${u.id}">ویرایش</button>
      <button class="btn" data-act="perm" data-id="${u.id}">مجوزها</button>
    </td>`;
    tbody.appendChild(tr);
  });
  qsa('#users-body button[data-act]')
    .forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const act = b.getAttribute('data-act');
      if (act === 'edit') openUserModalX(id);
      if (act === 'perm') openPermModal(id);
    }));
}

// Build modals and handle user CRUD and permissions
let CURRENT_EDIT_USER = null;
let CURRENT_PERM_USER = null;

function ensureUserAndPermModals(){
  // Upgrade user modal content
  const um = qs('#user-modal');
  if (um){
    const card = um.querySelector('.modal-card');
    if (card){
      card.innerHTML = `
        <h3 id="user-modal-title">افزودن کاربر</h3>
        <form id="user-form" class="form">
          <div class="grid full">
            <label class="field">
              <span>نام</span>
              <input id="user-first" type="text" required />
            </label>
            <label class="field">
              <span>نام خانوادگی</span>
              <input id="user-last" type="text" required />
            </label>
          </div>
          <div class="grid full">
            <label class="field">
              <span>تلفن/نام‌کاربری (11 رقم)</span>
              <input id="user-phone" type="text" inputmode="numeric" pattern="^\\d{11}$" placeholder="09xxxxxxxxx" required />
            </label>
            <label class="field">
              <span>کد یکتا (غیرقابل ویرایش)</span>
              <input id="user-code" type="text" inputmode="numeric" pattern="^\\d{5}$" readonly />
            </label>
          </div>
          <label class="field">
            <span>گذرواژه</span>
            <input id="user-pass" type="password" minlength="4" placeholder="******" />
          </label>
          <div class="modal-actions">
            <button type="button" class="btn" id="user-cancel">انصراف</button>
            <button type="submit" class="btn primary" id="user-save">ذخیره</button>
          </div>
          <p id="user-form-msg" class="hint"></p>
        </form>`;
    }
    qs('#user-cancel')?.addEventListener('click', () => qs('#user-modal')?.classList.add('hidden'));
    qs('#user-form')?.addEventListener('submit', onUserFormSubmitX);
  }
  // Create permission modal if missing
  if (!qs('#perm-modal')){
    const modal = document.createElement('div');
    modal.id = 'perm-modal'; modal.className = 'modal hidden';
    modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
    modal.innerHTML = `
      <div class="modal-card large">
        <h3 id="perm-modal-title">مجوزهای کاربر</h3>
        <div class="sub-layout">
          <aside class="sub-sidebar">
            <div class="sub-header">تب‌ها</div>
            <nav id="perm-subnav" class="sub-nav"></nav>
          </aside>
          <div class="sub-content">
            <div id="perm-content"></div>
            <div class="modal-actions">
              <button type="button" class="btn" id="perm-cancel">انصراف</button>
              <button type="button" class="btn primary" id="perm-save">ذخیره</button>
            </div>
            <p id="perm-msg" class="hint"></p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  qs('#perm-cancel')?.addEventListener('click', () => qs('#perm-modal')?.classList.add('hidden'));
  qs('#perm-save')?.addEventListener('click', savePermsFromModal);
}

function openUserModalX(id){
  const users = loadUsers();
  const isEdit = !!id; CURRENT_EDIT_USER = id || null;
  const title = qs('#user-modal-title'); if (title) title.textContent = isEdit ? 'ویرایش کاربر' : 'افزودن کاربر';
  const f = qs('#user-first'), l = qs('#user-last'), p = qs('#user-phone'), c = qs('#user-code'), pw = qs('#user-pass');
  const msg = qs('#user-form-msg'); if (msg) msg.textContent = '';
  if (isEdit){
    const u = users.find(x => x.id === id); if (!u) return;
    f.value = u.first || ''; l.value = u.last || ''; p.value = u.phone || '';
    c.value = u.code || ''; pw.value = '';
  } else {
    f.value = ''; l.value = ''; p.value = '';
    c.value = genCode(users); pw.value = '';
  }
  qs('#user-modal')?.classList.remove('hidden');
}

function onUserFormSubmitX(e){
  e.preventDefault();
  const first = qs('#user-first').value.trim();
  const last = qs('#user-last').value.trim();
  const phone = qs('#user-phone').value.trim();
  const code = qs('#user-code').value.trim();
  const pass = qs('#user-pass').value;
  const msg = qs('#user-form-msg');
  if (!first || !last){ msg && (msg.textContent = 'نام و نام خانوادگی الزامی است.'); return; }
  if (!/^\d{11}$/.test(phone)){ msg && (msg.textContent = 'شماره تلفن باید ۱۱ رقم باشد.'); return; }
  if (!/^\d{5}$/.test(code)){ msg && (msg.textContent = 'کد باید ۵ رقمی باشد.'); return; }
  const users = loadUsers();
  if (CURRENT_EDIT_USER){
    const i = users.findIndex(u => u.id === CURRENT_EDIT_USER); if (i === -1) return;
    const old = users[i]; users[i] = { ...old, first, last, phone, password: pass ? pass : old.password };
  } else {
    users.push({ id: genId(), code, first, last, phone, password: pass || '', active: true, email: '', permissions: { tabs: {}, parts: {} } });
  }
  saveUsers(users); renderUsers(); updateKpis();
  qs('#user-modal')?.classList.add('hidden');
}

function openPermModal(id){
  const users = loadUsers(); const u = users.find(x => x.id === id); if (!u) return;
  CURRENT_PERM_USER = id; const sub = qs('#perm-subnav'); const con = qs('#perm-content');
  if (!sub || !con) return; sub.innerHTML = ''; con.innerHTML = '';
  const perms = normalizePermissions(u.permissions);
  Object.entries(PERMISSION_TABS).forEach(([key, def], idx) => {
    const b = document.createElement('button'); b.className = 'sub-item' + (idx===0?' active':''); b.dataset.tab = key; b.textContent = def.label; b.addEventListener('click', () => switchPermTab(key)); sub.appendChild(b);
    const pane = document.createElement('div'); pane.className = 'perm-pane' + (idx===0?'':' hidden'); pane.dataset.tab = key;
    const chkId = `perm-tab-${key}`; const selId = `perm-parts-${key}`;
    const hasTab = !!perms.tabs[key];
    pane.innerHTML = `
      <div class="perm-row">
        <label class="chk"><input type="checkbox" id="${chkId}" ${hasTab?'checked':''}/> دسترسی به تب «${def.label}»</label>
        <label class="field">
          <span>مجوز بخش‌ها</span>
          <select id="${selId}" multiple></select>
        </label>
      </div>`;
    con.appendChild(pane);
    const sel = pane.querySelector('select');
    def.parts.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; if (Array.isArray(perms.parts[key]) && perms.parts[key].includes(p)) o.selected = true; sel.appendChild(o); });
  });
  qs('#perm-modal')?.classList.remove('hidden');
}

function switchPermTab(key){
  qsa('#perm-subnav .sub-item').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
  qsa('#perm-content .perm-pane').forEach(p => p.classList.toggle('hidden', p.dataset.tab !== key));
}

function normalizePermissions(perms){
  const p = perms && typeof perms === 'object' ? perms : {}; return { tabs: p.tabs || {}, parts: p.parts || {} };
}

function savePermsFromModal(){
  if (!CURRENT_PERM_USER) return; const users = loadUsers(); const i = users.findIndex(u => u.id === CURRENT_PERM_USER); if (i === -1) return;
  const tabs = {}; const parts = {}; Object.keys(PERMISSION_TABS).forEach(k => { const c = qs(`#perm-tab-${k}`); const s = qs(`#perm-parts-${k}`); tabs[k] = !!(c && c.checked); parts[k] = s ? [...s.options].filter(o => o.selected).map(o => o.value) : []; });
  users[i].permissions = { tabs, parts }; saveUsers(users); qs('#perm-modal')?.classList.add('hidden');
}

// Wire up after base script listeners
document.addEventListener('DOMContentLoaded', () => {
  try { ensureUserAndPermModals(); } catch {}
  const addBtn = qs('#add-user'); addBtn && addBtn.addEventListener('click', () => openUserModalX());
  // Initial render with extended schema
  try { renderUsers(); updateKpis(); renderUserPill(); } catch {}
});

