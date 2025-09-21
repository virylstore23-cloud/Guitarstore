(function(){
  const ENV = window.ENV||{};
  if(!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) return;
  const SB_URL = ENV.SUPABASE_URL, SB_KEY = ENV.SUPABASE_ANON_KEY;
  const HDRS  = {apikey:SB_KEY, Authorization:'Bearer '+SB_KEY};

  function ensureImageContain(root){
    const img = root.querySelector('.imgbox img, .imgwrap img, .left img'); if(!img) return;
    const r = window.state && window.state.byId && window.state.byId.get(String(root.getAttribute('data-id')||'')) ||
              null;
    const best = (r && (r.detail_image_url||r.primary_image_url||r.image_url)) || img.src;
    img.src = best;
    (img.closest('.imgbox, .imgwrap, .left')||img.parentElement).style.background='#fff';
    img.style.objectFit='contain'; img.style.background='#fff';
  }

  function injectNotIncluded(root, listLike){
    let arr=[];
    if(Array.isArray(listLike)) arr = listLike;
    else if(listLike && typeof listLike==='object' && Array.isArray(listLike.not_included)) arr = listLike.not_included;
    else if(typeof listLike==='string' && listLike.trim().startsWith('[')) { try{ arr = JSON.parse(listLike);}catch{} }
    if(!arr.length) return;

    const right = root.querySelector('.right') || root;
    let sec = right.querySelector('.section.not-included');
    if(!sec){
      sec = document.createElement('div');
      sec.className='section not-included';
      sec.innerHTML = '<h4>Not Included</h4><ul class="ni"></ul>';
      right.appendChild(sec);
    }
    const ul = sec.querySelector('ul.ni'); ul.innerHTML='';
    arr.forEach(t=>{ const li=document.createElement('li'); li.textContent=String(t); ul.appendChild(li); });
  }

  async function enhance(){
    const dlg = document.querySelector('dialog#detail'); if(!dlg||!dlg.open) return;
    const wrap = document.querySelector('#detailWrap')||dlg;

    // 1) make the image panel right
    ensureImageContain(wrap);

    // 2) get row from state (preferred) or by name from Supabase
    let r=null;
    const id = wrap.getAttribute('data-id');
    if(window.state?.byId && id) r = window.state.byId.get(String(id));
    if(!r){
      const name = wrap.querySelector('h3,.title')?.textContent?.trim();
      if(name){
        const url = SB_URL+'/rest/v1/drum_kits?name=eq.'+encodeURIComponent(name)+
          '&select=slug,specs,not_included,detail_image_url,primary_image_url';
        try{ const rows = await fetch(url,{headers:HDRS}).then(x=>x.json()); r = rows && rows[0]; }catch(_){}
      }
    }
    if(!r) return;

    const list = (r.specs && (r.specs.not_included||r.specs['not-included'])) || r.not_included;
    injectNotIncluded(wrap, list);
  }

  document.addEventListener('click', e=>{
    if(e.target.closest('[data-explore]')) setTimeout(enhance, 180);
  });
  setInterval(enhance, 700);
})();
