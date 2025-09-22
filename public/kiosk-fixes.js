(function(){
  function compactPricePills(root){
    (root||document).querySelectorAll('.pill.price').forEach(p=>{
      if(!p.querySelector('.aed-icon')){
        const i=document.createElement('span'); i.className='aed-icon';
        p.insertBefore(i, p.firstChild);
      }
    });
  }

  function pinCompareCtl(root){
    (root||document).querySelectorAll('.card').forEach(card=>{
      // ensure padding for the control
      const pb = parseInt(getComputedStyle(card).paddingBottom)||0;
      if(pb<50) card.style.paddingBottom='56px';

      // ensure cmpCtl exists
      if(!card.querySelector('.cmpCtl')){
        const id = card.getAttribute('data-id') || '';
        const label = document.createElement('label');
        label.className = 'cmpCtl';
        label.innerHTML = `<input type="checkbox" data-cmp data-id="${id}"><span>Add to compare</span>`;
        card.appendChild(label);
      }else{
        card.querySelector('.cmpCtl').classList.add('cmpCtl');
      }
    });
  }

  function fixDetailLayout(){
    const d = document.getElementById('detail'); if(!d) return;

    // ensure close works and is at top-right
    const close = d.querySelector('.btn.close');
    if(close){
      close.style.position='absolute'; close.style.top='12px'; close.style.right='12px';
      close.onclick = ()=> d.style.display='none';
    }
    const back = d.querySelector('.back');
    if(back){ back.onclick = ()=> d.style.display='none'; }

    // move demo chip next to the title if present
    const title = document.getElementById('dTitle');
    const top = document.getElementById('dTop');
    if(title && top){
      const demo = Array.from(top.children).find(x=>/demo/i.test(x.textContent||''));
      if(demo){
        demo.classList.add('pill-demo');
        if(title.nextSibling!==demo){
          title.parentNode.insertBefore(demo, title.nextSibling);
        }
      }
    }
  }

  function hideExplore(){
    // Hide buttons/links whose text is exactly "Explore"
    document.querySelectorAll('button, a').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^explore$/i.test(t)) el.classList.add('kiosk-hide-explore');
    });
  }

  function applyAll(root){
    compactPricePills(root);
    pinCompareCtl(root);
    fixDetailLayout();
    hideExplore();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    applyAll(document);
    // re-apply on dynamic changes
    new MutationObserver(muts=>{
      // throttle a bit
      clearTimeout(applyAll._t);
      applyAll._t=setTimeout(()=>applyAll(document),50);
    }).observe(document.body,{childList:true,subtree:true});
  });
})();
