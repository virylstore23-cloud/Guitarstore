(function(){
  function tagDemoChips(root){
    (root||document).querySelectorAll('#detail .pill, #detail .chip').forEach(function(el){
      const t=(el.textContent||'').toLowerCase();
      if(t.includes('demo')) el.classList.add('pill-demo');
    });
  }
  // ensure the Close button is inside the sheet so absolute top/left is stable
  function ensureCloseInsideSheet(){
    const root=document.getElementById('detail');
    if(!root) return;
    const sheet=root.querySelector('.sheet');
    const btn=root.querySelector('.close');
    if(sheet && btn && btn.parentElement!==sheet) sheet.appendChild(btn);
  }

  const boot=()=>{ tagDemoChips(document); ensureCloseInsideSheet(); };
  new MutationObserver(boot).observe(document.body, {subtree:true, childList:true});
  window.addEventListener('DOMContentLoaded', boot);
  boot();
})();
