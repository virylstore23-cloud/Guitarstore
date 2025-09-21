(function(){
  const ENV = window.ENV||{};
  if(!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) return;

  const SB_URL = ENV.SUPABASE_URL;
  const SB_KEY = ENV.SUPABASE_ANON_KEY;
  const HDRS  = { apikey: SB_KEY, Authorization: 'Bearer '+SB_KEY };

  function fetchByName(name){
    const url = SB_URL + '/rest/v1/drum_kits?name=eq.' + encodeURIComponent(name)
      + '&select=slug,specs,not_included,detail_image_url,primary_image_url';
    return fetch(url, { headers: HDRS }).then(r=>r.ok?r.json():null).catch(()=>null);
  }

  function ensureImageContain(root){
    const img = root.querySelector('.imgbox img, .imgwrap img, .left img, .image img') || root.querySelector('img');
    if(img){
      img.style.objectFit='contain';
      img.style.width='100%';
      img.style.height='100%';
      const box = img.closest('.imgbox, .imgwrap, .left, .image, .photo') || img.parentElement;
      if(box){ box.style.background='#fff'; box.style.borderRadius='12px'; }
      img.style.background='#fff';
    }
  }

  function injectNotIncluded(root, listLike){
    let arr = [];
    if(Array.isArray(listLike)) arr = listLike;
    else if(typeof listLike==='string' && listLike.trim().startsWith('[')){
      try{ arr = JSON.parse(listLike); }catch(e){}
    }else if(listLike && typeof listLike==='object' && Array.isArray(listLike.not_included)){
      arr = listLike.not_included;
    }
    if(!arr.length) return;

    const right = root.querySelector('.right') || root;
    let sec = right.querySelector('.section.not-included');
    if(!sec){
      sec = document.createElement('div');
      sec.className = 'section not-included';
      sec.innerHTML = '<h4>Not Included</h4><ul></ul>';
      (right.appendChild || right.parentNode.appendChild).call(right, sec);
    }
    const ul = sec.querySelector('ul'); ul.innerHTML='';
    arr.forEach(t=>{
      const li = document.createElement('li');
      li.textContent = String(t);
      ul.appendChild(li);
    });
  }

  function enhance(){
    const dlg  = document.querySelector('dialog#detail');
    const wrap = document.querySelector('#detailWrap') || dlg;
    if(!wrap || (dlg && !dlg.open)) return;

    ensureImageContain(wrap);

    const titleEl = wrap.querySelector('h3, .title, .product-title');
    const name = titleEl && titleEl.textContent ? titleEl.textContent.trim() : null;
    if(!name) return;

    fetchByName(name).then(rows=>{
      const r = rows && rows[0]; if(!r) return;

      // Prefer detail image if available
      const best = r.detail_image_url || r.primary_image_url;
      const img = wrap.querySelector('.imgbox img, .imgwrap img, .left img, .image img');
      if(img && best) img.src = best;

      // Not Included can live in specs.not_included or not_included column
      const fromSpecs = r.specs && r.specs.not_included;
      injectNotIncluded(wrap, fromSpecs || r.not_included);
    });
  }

  // Run after clicking any Explore (detail) button
  document.addEventListener('click', e=>{
    if(e.target.closest('[data-explore]')) setTimeout(enhance, 150);
  });

  // Also poll lightly while dialog is open (covers programmatic opens)
  let tick = null;
  document.addEventListener('DOMContentLoaded', ()=>{
    tick = setInterval(enhance, 600);
  });
})();
