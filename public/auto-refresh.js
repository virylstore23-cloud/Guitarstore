(function(){
  let lastJSON = '';
  async function silentRefresh(){
    try{
      const r = await fetch('/api/kits?t=' + Date.now(), { cache: 'no-store' });
      if(!r.ok) return;
      const rows = await r.json();
      const nextJSON = JSON.stringify(rows);
      if(nextJSON !== lastJSON){
        // Update BOTH globals so whichever the UI uses gets fresh data
        window.KITS = rows;
        window.__KITS = rows;

        // Re-render known entry points (only if defined)
        if (typeof window.renderChips   === 'function') window.renderChips();
        if (typeof window.renderGrid    === 'function') window.renderGrid();
        if (typeof window.renderCompare === 'function') window.renderCompare();
        if (typeof window.renderModal   === 'function') window.renderModal();

        // Also broadcast an event in case app.js listens to it
        try { window.dispatchEvent(new CustomEvent('kits:updated', { detail: rows })); } catch(_){}

        lastJSON = nextJSON;
      }
    }catch(_){ /* ignore transient errors */ }
  }

  // Kick off
  window.addEventListener('load', () => setTimeout(silentRefresh, 2000), { once:true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') silentRefresh();
  });
  window.addEventListener('online', silentRefresh);
  // Poll more aggressively for kiosk use
  setInterval(silentRefresh, 15000); // 15s
})();
