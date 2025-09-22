// ---- kiosk hotfix (minimal, theme-safe) ----
(function(){
  // 1) move any "demo" pill next to the title and shrink it
  function relocateDemo(){
    const modal = document.getElementById('detail');
    if(!modal) return;
    const title = modal.querySelector('#dTitle,.title,h2,h3');
    if(!title) return;
    const demo = [...modal.querySelectorAll('.pill,.chip')]
      .find(el => /demo/i.test((el.textContent||'')));
    if(demo){
      demo.classList.add('pill-demo');
      // place right after the title
      if(title.nextSibling !== demo) title.insertAdjacentElement('afterend', demo);
    }
  }
  // run when detail changes
  const det = document.getElementById('detail');
  if(det){
    new MutationObserver(relocateDemo).observe(det, {subtree:true, childList:true});
  }
  document.addEventListener('DOMContentLoaded', relocateDemo);

  // 2) hide any "Explore" buttons/links (card and detail)
  function killExplore(){
    document.querySelectorAll('button,a').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^explore$/i.test(t)) el.remove();
    });
  }
  document.addEventListener('DOMContentLoaded', killExplore);
  // in case grid re-renders later:
  new MutationObserver(killExplore).observe(document.body,{subtree:true, childList:true});

  // 3) ensure compare count/FAB re-syncs if checkboxes toggle after re-renders
  function syncFab(){
    const checks=[...document.querySelectorAll('[data-cmp]')];
    const n = checks.filter(c=>c.checked).length;
    const fab=document.getElementById('compareFab');
    const cc=document.getElementById('cmpCount');
    const fc=document.getElementById('fabCount');
    if(cc) cc.textContent = n;
    if(fc) fc.textContent = n;
    if(fab) fab.style.display = n ? 'flex' : 'none';
  }
  document.addEventListener('change', e=>{
    if(e.target && e.target.matches('[data-cmp]')) syncFab();
  });
  new MutationObserver(syncFab).observe(document.body,{subtree:true, childList:true});
})();
