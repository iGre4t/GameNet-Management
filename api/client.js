// Lightweight API client and capture-phase overrides
(function(){
  const AUTH_KEY = 'gamenet_auth';
  const PASS_KEY = 'gamenet_admin_password';
  const CURRENT_USER_KEY = 'gamenet_current_user_id';
  const API_BASE = 'api';
  const $ = (sel, root = document) => root.querySelector(sel);

  async function apiFetch(path, opts = {}){
    const res = await fetch(`${API_BASE}/${path}`, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, opts));
    let data = null; try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || (data && data.ok === false)) throw new Error((data && data.error) || res.statusText);
    return data;
  }

  async function loadUsers(){
    const data = await apiFetch('users.php');
    return Array.isArray(data.data) ? data.data : [];
  }

  async function refreshUsers(){
    try {
      const list = await loadUsers();
      if (Array.isArray(list) && Array.isArray(window.USER_DB)){
        window.USER_DB.length = 0;
        list.forEach(u => window.USER_DB.push(u));
      }
      try { window.renderUsers && window.renderUsers(); } catch {}
      try { window.updateKpis && window.updateKpis(); } catch {}
    } catch {}
  }

  async function createUser(payload){
    return apiFetch('users.php', { method: 'POST', body: JSON.stringify(payload) });
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Capture login to support DB-backed staff users and admin fallback
    const form = $('#login-form');
    form && form.addEventListener('submit', async (e) => {
      try {
        e.preventDefault();
        e.stopImmediatePropagation();
        const user = $('#username').value.trim();
        const pass = $('#password').value;
        const saved = localStorage.getItem(PASS_KEY) || '1234';
        const err = $('#login-error');

        if (user === 'admin' && pass === saved){
          localStorage.setItem(AUTH_KEY, 'ok');
          try { localStorage.setItem(CURRENT_USER_KEY, 'admin'); } catch {}
          err && (err.textContent = '');
          window.setView && window.setView(true);
          window.setActiveTab && window.setActiveTab('home');
          try { window.renderUserPill && window.renderUserPill(); } catch {}
          try { if (typeof window.renderProfileBox === 'function') window.renderProfileBox(); } catch {}
          refreshUsers();
          return;
        }

        // Remote authentication via API
        const out = await apiFetch('auth.php', { method: 'POST', body: JSON.stringify({ identifier: user, password: pass }) });
        if (out && out.ok){
          localStorage.setItem(AUTH_KEY, 'ok');
          try { localStorage.setItem(CURRENT_USER_KEY, String(out.user && out.user.id || '')); } catch {}
          err && (err.textContent = '');
          window.setView && window.setView(true);
          window.setActiveTab && window.setActiveTab('home');
          try { window.renderUserPill && window.renderUserPill(); } catch {}
          try { if (typeof window.renderProfileBox === 'function') window.renderProfileBox(); } catch {}
          refreshUsers();
          return;
        }
        throw new Error('خطای ورود');
      } catch (ex) {
        const err = $('#login-error');
        if (err) err.textContent = 'ورود ناموفق. نام کاربری/رمز را بررسی کنید.';
      }
    }, true);

    // Capture Add User modal submit to create DB-backed user
    const uform = $('#user-form');
    uform && uform.addEventListener('submit', async (e) => {
      try {
        e.preventDefault();
        e.stopImmediatePropagation();
        const phone = $('#user-phone').value.trim();
        const pass = $('#user-pass').value;
        const msg = $('#user-form-msg');
        if (!/^\d{11}$/.test(phone)) { msg && (msg.textContent = 'شماره موبایل نامعتبر است.'); return; }
        if (!pass || pass.length < 4) { msg && (msg.textContent = 'رمز عبور حداقل ۴ کاراکتر باشد.'); return; }
        await createUser({ name: '', phone, password: pass });
        await refreshUsers();
        if (msg) msg.textContent = '';
        const modal = $('#user-modal');
        if (modal) modal.classList.add('hidden');
        try { uform.reset(); } catch {}
      } catch (ex) {
        const msg = $('#user-form-msg');
        if (msg) msg.textContent = 'خطا در ثبت کاربر';
      }
    }, true);
  });
})();

