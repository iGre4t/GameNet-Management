// Lightweight API client and capture‑phase overrides for DB users
(function () {
  const AUTH_KEY = 'gamenet_auth';
  const PASS_KEY = 'gamenet_admin_password';
  const CURRENT_USER_KEY = 'gamenet_current_user_id';

  // Prefer same-origin by default; allow override via window.GAMENET_API
  const API_BASE =
    (typeof window !== 'undefined' && typeof window.GAMENET_API !== 'undefined')
      ? String(window.GAMENET_API || '').replace(/\/$/, '')
      : '';

  const $ = (sel, root = document) => root.querySelector(sel);

  async function apiFetch(path, opts = {}) {
    const base = API_BASE ? `${API_BASE}/api` : 'api';
    const res = await fetch(`${base}/${path}`, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, opts));
    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || (data && data.ok === false)) {
      throw new Error((data && data.error) || res.statusText);
    }
    return data;
  }

  async function loadUsersFromApi() {
    const data = await apiFetch('users.php');
    return Array.isArray(data.data) ? data.data : [];
  }

  function getUsersArrayRef() {
    try { return USER_DB; } catch (e) { /* not a global var */ }
    if (Array.isArray(window.USER_DB)) return window.USER_DB;
    return null;
  }

  // Pull users from DB and push into both USER_DB (if present) and
  // the localStorage-backed users that app.js uses for rendering.
  async function refreshUsers() {
    try {
      const list = await loadUsersFromApi();

      const target = getUsersArrayRef();
      if (Array.isArray(list) && Array.isArray(target)) {
        target.length = 0;
        list.forEach((u) => target.push(u));
      }

      try {
        if (typeof window.saveUsers === 'function') {
          const mapped = Array.isArray(list)
            ? list.map((u) => {
                const full = String(u && u.name || '').trim();
                const parts = full.split(/\s+/, 2);
                const first = parts[0] || '';
                const last = parts[1] || '';
                return {
                  id: String(u.id),
                  code: u.code || '',
                  first,
                  last,
                  phone: u.phone || '',
                  password: '',
                  active: !!u.active,
                  email: u.email || '',
                  type: 'employee',
                  permissions: { tabs: {}, parts: {} }
                };
              })
            : [];

          // Ensure an admin placeholder exists for UI fallbacks
          mapped.unshift({
            id: 'admin',
            code: '00000',
            first: 'ادمین',
            last: '',
            phone: '',
            password: '',
            active: true,
            email: 'admin@example.com',
            type: 'superadmin',
            permissions: { tabs: {}, parts: {} }
          });

          window.saveUsers(mapped);
        }
      } catch { /* ignore mapping errors */ }

      try { window.renderUsers && window.renderUsers(); } catch {}
      try { window.updateKpis && window.updateKpis(); } catch {}
      try { window.renderUserPill && window.renderUserPill(); } catch {}
    } catch {
      // Ignore refresh errors; panel can still work with local data
    }
  }

  async function createUser(payload) {
    return apiFetch('users.php', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  function attachLoginHandler() {
    const form = $('#login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      try {
        e.preventDefault();
        e.stopImmediatePropagation();

        const user = $('#username').value.trim();
        const pass = $('#password').value;
        const saved = localStorage.getItem(PASS_KEY) || '1234';
        const err = $('#login-error');

        // Local admin login
        if (user === 'admin' && pass === saved) {
          localStorage.setItem(AUTH_KEY, 'ok');
          try { localStorage.setItem(CURRENT_USER_KEY, 'admin'); } catch {}
          if (err) err.textContent = '';
          window.setView && window.setView(true);
          window.setActiveTab && window.setActiveTab('home');
          try { window.renderUserPill && window.renderUserPill(); } catch {}
          try { if (typeof window.renderProfileBox === 'function') window.renderProfileBox(); } catch {}
          await refreshUsers();
          return;
        }

        // Remote authentication via API (phone or code)
        const out = await apiFetch('auth.php', {
          method: 'POST',
          body: JSON.stringify({ identifier: user, password: pass })
        });

        if (out && out.ok) {
          localStorage.setItem(AUTH_KEY, 'ok');
          try {
            localStorage.setItem(
              CURRENT_USER_KEY,
              String(out.user && out.user.id || '')
            );
          } catch {}
          if (err) err.textContent = '';
          window.setView && window.setView(true);
          window.setActiveTab && window.setActiveTab('home');
          try { window.renderUserPill && window.renderUserPill(); } catch {}
          try { if (typeof window.renderProfileBox === 'function') window.renderProfileBox(); } catch {}
          await refreshUsers();
          return;
        }

        throw new Error('Invalid credentials');
      } catch {
        const err = $('#login-error');
        if (err) {
          err.textContent = 'ورود ناموفق بود. لطفاً نام‌کاربری/تلفن و گذرواژه را بررسی کنید.';
        }
      }
    }, true); // capture
  }

  function attachUserFormHandler() {
    const form = $('#user-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      try {
        e.preventDefault();
        e.stopImmediatePropagation();

        const firstEl = $('#user-first');
        const lastEl = $('#user-last');
        const phoneEl = $('#user-phone');
        const codeEl = $('#user-code');
        const passEl = $('#user-pass');
        const typeEl = $('#user-type');

        const first = firstEl ? firstEl.value.trim() : '';
        const last = lastEl ? lastEl.value.trim() : '';
        const phone = phoneEl ? phoneEl.value.trim() : '';
        const code = codeEl ? codeEl.value.trim() : '';
        const pass = passEl ? passEl.value : '';
        const type = typeEl ? (typeEl.value || 'employee') : 'employee';

        const msg = $('#user-form-msg');

        if (!first || !last) {
          msg && (msg.textContent = 'نام و نام خانوادگی الزامی است.');
          return;
        }
        if (!/^\d{11}$/.test(phone)) {
          msg && (msg.textContent = 'تلفن/نام‌کاربری باید ۱۱ رقم باشد.');
          return;
        }
        if (!/^\d{5}$/.test(code)) {
          msg && (msg.textContent = 'کد یکتا باید ۵ رقم باشد.');
          return;
        }
        if (!pass || pass.length < 4) {
          msg && (msg.textContent = 'گذرواژه باید حداقل ۴ کاراکتر باشد.');
          return;
        }

        const fullName = `${first} ${last}`.trim();

        const out = await createUser({
          name: fullName,
          phone,
          password: pass,
          code
        });

        // Mirror into localStorage-backed users so the panel shows it immediately
        try {
          if (typeof window.loadUsers === 'function' && typeof window.saveUsers === 'function') {
            const arr = window.loadUsers();
            if (Array.isArray(arr)) {
              const newId =
                (out && typeof out.id !== 'undefined')
                  ? String(out.id)
                  : (typeof window.genId === 'function' ? window.genId() : phone);

              arr.push({
                id: newId,
                code,
                first,
                last,
                phone,
                password: pass,
                active: true,
                email: '',
                type,
                permissions: { tabs: {}, parts: {} }
              });
              window.saveUsers(arr);
            }
          }
        } catch { /* ignore local mirror errors */ }

        await refreshUsers();

        if (msg) msg.textContent = '';
        const modal = $('#user-modal');
        if (modal) modal.classList.add('hidden');
        try { (e.target || form).reset(); } catch {}
      } catch {
        const msg = $('#user-form-msg');
        if (msg) msg.textContent = 'خطا در ذخیره کاربر جدید.';
      }
    }, true); // capture
  }

  window.addEventListener('DOMContentLoaded', () => {
    attachLoginHandler();

    // app.js upgrades the Add User modal on DOMContentLoaded as well and
    // replaces its innerHTML, so we delay our wiring to run afterwards.
    setTimeout(attachUserFormHandler, 0);
  });
})(); 

