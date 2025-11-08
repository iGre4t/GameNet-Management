// Bridge localStorage for branches to database via API
(function(){
  const KEY = 'gamenet_branches';
  // Prefer same-origin by default; allow override via window.GAMENET_API
  const API_BASE = (typeof window !== 'undefined' && typeof window.GAMENET_API !== 'undefined')
    ? String(window.GAMENET_API || '').replace(/\/$/, '')
    : '';
  const API = API_BASE ? `${API_BASE}/api/store.php` : 'api/store.php';
  const original = {
    getItem: localStorage.getItem.bind(localStorage),
    setItem: localStorage.setItem.bind(localStorage),
  };

  let cache = null; // stringified JSON

  function syncFetch(url){
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, false); // synchronous
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300){
        try { const x = JSON.parse(xhr.responseText); return x; } catch { return null; }
      }
    } catch {}
    return null;
  }

  function postAsync(url, body){
    try {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(()=>{});
    } catch {}
  }

  // Override getItem/setItem only for our key
  localStorage.getItem = function(k){
    if (k !== KEY) return original.getItem(k);
    if (cache == null){
      const res = syncFetch(`${API}?key=branches`);
      if (res && res.ok){
        try { cache = JSON.stringify(res.data || []); } catch { cache = '[]'; }
      } else {
        cache = '[]';
      }
    }
    return cache;
  };

  localStorage.setItem = function(k, v){
    if (k !== KEY) return original.setItem(k, v);
    cache = String(v == null ? '' : v);
    try {
      const data = JSON.parse(cache || '[]');
      postAsync(API, { key: 'branches', data });
    } catch {
      // ignore parse error
    }
    return undefined;
  };
})();
