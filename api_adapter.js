// Backend-aware overrides for users list and persistence.
// Loaded after app.js to keep the UI code unchanged while switching storage.
(function(){
  function qs(sel, root = document) { return (root||document).querySelector(sel); }
  function apiGet(path){ return fetch(path, { credentials:'same-origin' }).then(r=>r.json()); }
  function apiPost(path, body){ return fetch(path, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) }).then(r=>r.json()); }

  if (typeof window.BACKEND === 'undefined') window.BACKEND = false;
  if (typeof window.USERS_CACHE === 'undefined') window.USERS_CACHE = [];

  async function detect(){
    try { const j = await apiGet('/api/ping.php'); window.BACKEND = !!(j && j.ok); } catch { window.BACKEND = false; }
    if (window.BACKEND){
      try { const s = await apiGet('/api/session.php'); if (s && s.ok && s.user){ try { localStorage.setItem('gamenet_auth','ok'); localStorage.setItem('gamenet_current_user_id', s.user.id||'admin'); } catch {} } } catch {}
      try { const u = await apiGet('/api/users.php'); if (u && u.ok && Array.isArray(u.users)) window.USERS_CACHE = u.users; } catch {}
      try { if (typeof updateKpis === 'function') updateKpis(); if (typeof renderUsers === 'function') renderUsers(); } catch {}
    }
  }

  function loadUsersBackendAware(){
    if (window.BACKEND){ return Array.isArray(window.USERS_CACHE) ? window.USERS_CACHE : []; }
    try { const raw = localStorage.getItem('gamenet_users'); if (raw) return JSON.parse(raw); } catch {}
    const seeded = [
      { id: 'admin', code: '00000', first: 'Admin', last: 'User', phone: '', password: '', active: true, email: 'admin@example.com', permissions: { tabs: {}, parts: {} } }
    ];
    try { localStorage.setItem('gamenet_users', JSON.stringify(seeded)); } catch {}
    return seeded;
  }

  function saveUsersBackendAware(arr){
    if (window.BACKEND){
      window.USERS_CACHE = Array.isArray(arr) ? arr : [];
      apiPost('/api/sync_users.php', { users: window.USERS_CACHE }).catch(()=>{});
      return;
    }
    try { localStorage.setItem('gamenet_users', JSON.stringify(arr)); } catch {}
  }

  // Override globally after app.js is loaded
  window.loadUsers = loadUsersBackendAware;
  window.saveUsers = saveUsersBackendAware;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', detect); else detect();
})();

