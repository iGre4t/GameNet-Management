// Sidebar enhancements: icons for nav, rename settings label, and profile box at bottom
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Rename settings tab to Persian
    const settingsLabel = document.querySelector('.nav [data-tab="settings"] span');
    if (settingsLabel) settingsLabel.textContent = 'تنظیمات کاربری';

    // Add outline icons beside nav items using Remix Icons
    const ICONS = {
      home: 'ri-home-5-line',
      users: 'ri-user-3-line',
      branches: 'ri-building-2-line',
      settings: 'ri-user-settings-line',
      stats: 'ri-bar-chart-2-line',
      dev: 'ri-code-line'
    };
    function addIcon(btn){
      if (!btn || btn.querySelector('.icon')) return;
      const i = document.createElement('i');
      i.className = `${ICONS[btn.dataset.tab] || 'ri-checkbox-blank-line'} icon`;
      i.setAttribute('aria-hidden', 'true');
      btn.insertBefore(i, btn.firstChild);
    }
    document.querySelectorAll('.nav .nav-item').forEach(addIcon);
    const nav = document.querySelector('.nav');
    if (nav){
      const mo = new MutationObserver(() => nav.querySelectorAll('.nav-item').forEach(addIcon));
      mo.observe(nav, { childList: true, subtree: true });
    }

    // Profile box at bottom
    function getCurrentUserSafe(){
      try { return (typeof getCurrentUser === 'function') ? getCurrentUser() : null; } catch { return null; }
    }
    function renderProfileBox(){
      const foot = document.querySelector('.sidebar-footer');
      if (!foot) return;
      const u = getCurrentUserSafe();
      const full = u ? `${u.first || ''} ${u.last || ''}`.trim() || (u.name || '') : '';
      foot.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'profile-box';
      const name = document.createElement('div');
      name.id = 'profile-name';
      name.className = 'profile-name';
      name.textContent = full || 'نام و نام خانوادگی';
      const btn = document.createElement('button');
      btn.id = 'logout';
      btn.className = 'btn';
      btn.style.width = '100%';
      btn.textContent = 'خروج';
      // Prepare icon + label, and clear raw text for better collapsed look
      (function(){
        btn.textContent = '';
        const icon = document.createElement('i');
        icon.className = 'ri-logout-box-r-line icon';
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = 'OrO�U^O�';
        btn.appendChild(icon);
        btn.appendChild(label);
        try { btn.title = label.textContent; } catch {}
      })();
      btn.addEventListener('click', () => {
        localStorage.removeItem('gamenet_auth');
        try { localStorage.removeItem('gamenet_current_user_id'); } catch {}
        if (typeof setView === 'function') setView(false);
      });
      box.appendChild(name);
      box.appendChild(btn);
      foot.appendChild(box);
    }
    renderProfileBox();

    // Final titles override for page title
    window.setActiveTab = function(tab){
      document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
      const titles = { home: 'خانه', stats: 'آمار مدیریت و حسابداری', users: 'کاربران', settings: 'تنظیمات کاربری' };
      const el = document.getElementById('page-title');
      if (el) el.textContent = titles[tab] || '';
    };
  } catch {}
});
