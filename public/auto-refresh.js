(function(){
  // cheap, safe diff to avoid unnecessary re-render
  function changed(oldArr, newArr){
    if (!Array.isArray(oldArr) || !Array.isArray(newArr)) return true;
    if (oldArr.length !== newArr.length) return true;
    // compare a few stable fields if present
    const pick = (a) => a?.map?.(x => `${x.id ?? ''}|${x.name ?? ''}|${x.updated_at ?? ''}`) ?? [];
    const o = pick(oldArr), n = pick(newArr);
    for (let i=0;i<n.length;i++){ if (o[i] !== n[i]) return true; }
    return false;
  }

  async function silentRefresh(){
    try{
      const r = await fetch(`/api/kits?t=${Date.now()}`, { cache: 'no-store' });
      if(!r.ok) return;
      const data = await r.json();
      if(!Array.isArray(data)) return;

      const old = Array.isArray(window.KITS) ? window.KITS : [];
      if (changed(old, data)) {
        window.KITS = data;
        if (typeof window.renderChips === 'function') window.renderChips();
        if (typeof window.renderGrid  === 'function') window.renderGrid();
        if (typeof window.renderCompare === 'function') window.renderCompare();
        if (typeof window.renderModal   === 'function') window.renderModal();
      }
    } catch(_){ /* ignore transient errors */ }
  }

  // Run after initial paint, then on events + interval
  window.addEventListener('load', () => setTimeout(silentRefresh, 3000), { once:true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') silentRefresh();
  });
  window.addEventListener('online', silentRefresh);
  setInterval(silentRefresh, 60000); // every 60s
})();
