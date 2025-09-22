(function(){
  function tagDemoChips(root){
    (root||document).querySelectorAll('#detail .pill, #detail .chip').forEach(function(el){
      const t=(el.textContent||'').toLowerCase();
      if(t.includes('demo')) el.classList.add('pill-demo');
    });
  }

  // Move Close into the sheet so CSS top-right works
  function placeCloseTopRight(){
    const root=document.getElementById('detail');
    if(!root) return;
    const sheet=root.querySelector('.sheet')||root;
    const btn=root.querySelector('.close');
    if(btn && sheet && btn.parentElement!==sheet){
      sheet.appendChild(btn);
    }
  }

  // Move the demo chip next to the product title
  function moveDemoNextToTitle(){
    const root=document.getElementById('detail');
    if(!root) return;
    const right = root.querySelector('.col.r') || root;
    const title = right.querySelector('.title') || right.querySelector('h2');
    const chip  = right.querySelector('.pill-demo');
    if(!title || !chip) return;

    let row = right.querySelector('.title-row');
    if(!row){
      row = document.createElement('div');
      row.className='title-row';
      // insert the row where the title currently lives
      title.parentNode.insertBefore(row, title);
    }
    if(title.parentElement !== row) row.appendChild(title);
    if(chip.parentElement  !== row) row.appendChild(chip);
  }

  const boot = ()=>{ tagDemoChips(document); placeCloseTopRight(); moveDemoNextToTitle(); };
  new MutationObserver(boot).observe(document.body,{subtree:true,childList:true});
  window.addEventListener('DOMContentLoaded', boot);
  boot();
})();
