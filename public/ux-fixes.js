(function(){
  if (window.__uxFixes) return; window.__uxFixes = true;

  function onReady(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  const $$  = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const $1  = (sel, root=document) => root.querySelector(sel);

  // --- A) Title centered (keeps your font/colors)
  onReady(()=>{
    const h = $1('h1, #title, .title');
    if (h){ h.style.textAlign='center'; h.classList?.add('text-center'); }
  });

  // --- B) Hide small "data comes from ..." footer/info if present
  onReady(()=>{
    const candidates = $$('.api-info, #data-source, #dataFrom, footer, .text-xs');
    for (const el of candidates){
      const t = (el.textContent || '').toLowerCase().trim();
      if (/data\s+comes\s+from|supabase|api:?/i.test(t)) { el.style.display='none'; }
    }
  });

  // --- C) Keep cards expandable (safe delegation, works on all current cards)
  function togglePanel(card){
    const panel = $1('.kit-details, .panel, [data-role="details"]', card);
    if (panel){ panel.classList.toggle('hidden'); }
  }
  document.addEventListener('click', (e)=>{
    const header = e.target.closest('.toggle-details, [data-toggle="details"], .kit-header, .card-header');
    const card   = e.target.closest('.kit-card, .card, [data-role="kit"]');
    if (header && card){ e.preventDefault(); togglePanel(card); }
  });

  // --- D) Compare Kits (no UI redesign; adds tiny checkboxes only when you press the button)
  let compareMode=false, chosen=new Set(), kitsByName=null;

  async function ensureKits(){
    if (kitsByName) return kitsByName;
    try{
      const r = await fetch('/api/kits', {cache:'no-store'});
      const j = await r.json();
      kitsByName = new Map((j.kits||[]).map(k=>[String(k.name).trim(), k]));
    }catch(_){}
    return kitsByName||new Map();
  }

  function kitKey(card){
    return (card.dataset.slug && card.dataset.slug.trim()) ||
           ( $1('h3, .kit-name, .card-title', card)?.textContent||'' ).trim();
  }

  function addCompareBoxes(){
    $$('.kit-card, .card, [data-role="kit"]').forEach(card=>{
      if ($1('input.cmp-box', card)) return;
      card.style.position = card.style.position || 'relative';
      const key = kitKey(card);
      const box = document.createElement('input');
      box.type='checkbox'; box.className='cmp-box';
      Object.assign(box.style, {
        position:'absolute', top:'8px', right:'10px', transform:'scale(1.2)',
        zIndex: 5, accentColor:'#f43f5e' // tailwind rose-500-ish; tiny, unobtrusive
      });
      box.addEventListener('change', ()=>{
        if (box.checked) chosen.add(key); else chosen.delete(key);
        renderCompareOverlay();
      });
      card.appendChild(box);
    });
  }
  function removeCompareBoxes(){
    $$('.cmp-box').forEach(x=>x.remove());
  }

  function overlayEl(){
    let ov = $1('#compareOverlay');
    if (!ov){
      ov = document.createElement('div');
      ov.id='compareOverlay';
      ov.className='fixed inset-0 z-50 hidden';
      ov.innerHTML = `
        <div class="absolute inset-0" style="background:rgba(0,0,0,.6)"></div>
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-xl"
             style="width:min(1200px,92vw); max-height:88vh; overflow:auto; background:#3b0a0a; border:1px solid rgba(255,255,255,.08);">
          <div class="sticky top-0 px-4 py-3" style="background:#4a0d0d; border-bottom:1px solid rgba(255,255,255,.06); display:flex; align-items:center; justify-content:space-between;">
            <h3 style="margin:0; font-size:20px; font-weight:700; color:#fff;">Compare Kits</h3>
            <div style="display:flex; gap:8px;">
              <button id="cmpClear"  class="px-3 py-1.5 rounded" style="background:#7f1d1d;color:#fff;">Clear</button>
              <button id="cmpClose"  class="px-3 py-1.5 rounded" style="background:#991b1b;color:#fff;">Close</button>
            </div>
          </div>
          <div id="cmpBody" class="p-4"></div>
        </div>`;
      document.body.appendChild(ov);
      $1('#cmpClose',ov).onclick = exitCompare;
      $1('#cmpClear',ov).onclick = ()=>{ chosen.clear(); renderCompareOverlay(); };
      ov.addEventListener('click', (e)=>{ if (e.target===ov.firstElementChild) exitCompare(); });
    }
    return ov;
  }

  async function renderCompareOverlay(){
    const ov = overlayEl();
    const body = $1('#cmpBody', ov);
    const map = await ensureKits();

    const selected = [...chosen].map(name=>map.get(name)).filter(Boolean);
    if (!selected.length){ ov.classList.add('hidden'); return; }

    // Build columns (name, image, price, upc, 5 features, 5 contents)
    const rows = [];
    const take = (arr,n)=> (Array.isArray(arr)?arr:[]).filter(Boolean).slice(0,n);

    function td(html){ return `<td style="vertical-align:top; padding:8px 10px; color:#eee; font-size:13px;">${html||'—'}</td>`; }
    function th(html){ return `<th style="text-align:left; padding:8px 10px; color:#fff; font-weight:700; font-size:13px;">${html}</th>`; }

    const head = `<tr>${th('Field')}${selected.map(k=>th(k.name)).join('')}</tr>`;
    const imgRow = `<tr>${th('Image')}${selected.map(k=>td(`<img src="${k.primary_image_url||k.detail_image_url||''}" style="width:220px;max-width:26vw;height:auto;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">`)).join('')}</tr>`;
    const priceRow = `<tr>${th('Price')}${selected.map(k=>td(k.price?`AED ${Number(k.price).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—')).join('')}</tr>`;
    const upcRow = `<tr>${th('UPC')}${selected.map(k=>td(k.upc_code||'—')).join('')}</tr>`;
    const featRows = take((selected[0]?.features)||[],5).map((_,i)=> `<tr>${th(i===0?'Key Features':'')}${selected.map(k=>td(take(k.features,5)[i]||'')).join('')}</tr>`).join('');
    const contRows = take((selected[0]?.contents)||[],5).map((_,i)=> `<tr>${th(i===0?`What's Included`:'')}${selected.map(k=>td(take(k.contents,5)[i]||'')).join('')}</tr>`).join('');

    body.innerHTML = `
      <table style="width:100%; border-collapse:separate; border-spacing:0 4px;">
        <tbody>${head}${imgRow}${priceRow}${upcRow}${featRows}${contRows}</tbody>
      </table>`;
    ov.classList.remove('hidden');
  }

  function enterCompare(){
    compareMode = true;
    addCompareBoxes();
    chosen.clear();
    renderCompareOverlay(); // opens once user ticks any box
  }
  function exitCompare(){
    compareMode = false;
    removeCompareBoxes();
    chosen.clear();
    const ov = $1('#compareOverlay'); if (ov) ov.classList.add('hidden');
  }

  // Wire the "Compare Kits" button by its text (no HTML id required)
  onReady(()=>{
    const candidates = $$('button, a, .btn');
    const cmp = candidates.find(el => /compare\s+kits/i.test(el.textContent||''));
    if (cmp){ cmp.addEventListener('click', (e)=>{ e.preventDefault(); enterCompare(); }); }
  });
})();

/* ==== UX PATCH PACK (chips spacer + modal image contain) ==== */
(function(){
  function stickyHeight(){
    const s=document.querySelector('[class*="actionbar"], [id*="sticky"], .actionbar');
    return s ? s.getBoundingClientRect().height : 0;
  }
  function ensureChipSpacer(){
    const grid=document.getElementById('kitGrid')||document.querySelector('#grid');
    if(!grid) return;
    const row=document.querySelector('#app .flex.flex-wrap.gap-2, .flex.flex-wrap.gap-2');
    if(!row) return;
    let sp=document.getElementById('chip-spacer');
    if(!sp){ sp=document.createElement('div'); sp.id='chip-spacer'; sp.style.height='0px'; row.parentElement.insertBefore(sp,row); }
    sp.style.height = (stickyHeight()>0? (stickyHeight()+8) : 12) + 'px';
  }
  function fixImages(root){
    // card images should cover (keep as-is), detail modal should be contain on white
    const modalImg=(root||document).querySelector('#modal-detail img, #detailImage');
    if(modalImg){
      modalImg.style.objectFit='contain';
      modalImg.style.background='#fff';
      const frame=modalImg.closest('.img-frame'); if(frame) frame.style.background='#fff';
    }
  }
  // keep spacer in sync
  addEventListener('resize', ensureChipSpacer);
  const mo1=new MutationObserver(ensureChipSpacer);
  mo1.observe(document.documentElement,{childList:true,subtree:true});
  // watch modal mutations for image fix
  const mo2=new MutationObserver(()=>fixImages(document));
  mo2.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','class','style']});

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ensureChipSpacer();fixImages(document);},{once:true});
  }else{ ensureChipSpacer(); fixImages(document); }
})();

/* ==== Price capsule to right column (above Add to compare) ==== */
(function(){
  if(document.getElementById('ux-price-css')){}else{
    const s=document.createElement('style'); s.id='ux-price-css';
    s.textContent=`.price-capsule{display:inline-block;background:#16a34a;color:#fff;font-weight:700;
      padding:.22rem .6rem;border-radius:9999px;font-size:.92rem;border:1px solid #059669}
      .upc-chip{display:inline-block;background:#0b1220;border:1px solid #334155;color:#cbd5e1;
      padding:.18rem .5rem;border-radius:.5rem;font-size:.72rem}
      .price-stack{display:flex;flex-direction:column;align-items:flex-end;gap:.25rem;margin-right:.25rem}`;
    document.head.appendChild(s);
  }
  function m(txt, rx){return rx.test(txt||'')?txt.replace(rx,'').trim():null}
  function move(card){
    if(card.__movedPrice) return;
    const footer = card.querySelector('.card-footer') || card;
    const compare = footer.querySelector('label [data-sel]')?.closest('label'); if(!compare) return;

    // locate existing Price:/UPC:
    const priceEl=[...card.querySelectorAll('div,span,p')].find(n=>/^\s*Price:\s*/i.test(n.textContent||''));
    const upcEl  =[...card.querySelectorAll('div,span,p,small')].find(n=>/^\s*UPC:\s*/i.test(n.textContent||''));
    const priceTxt = priceEl? m(priceEl.textContent,/^\s*Price:\s*/i) : null;
    const upcTxt   = upcEl?  upcEl.textContent.trim() : null;
    if(!priceTxt && !upcTxt) return;

    const stack=document.createElement('div'); stack.className='price-stack';
    if(priceTxt){ const pill=document.createElement('span'); pill.className='price-capsule'; pill.textContent=priceTxt; stack.appendChild(pill); }
    if(upcTxt){ const chip=document.createElement('span'); chip.className='upc-chip'; chip.textContent=upcTxt; stack.appendChild(chip); }
    compare.parentElement.insertBefore(stack, compare);

    if(priceEl) priceEl.style.display='none';
    if(upcEl)   upcEl.style.display='none';
    card.__movedPrice=true;
  }
  function sweep(){ document.querySelectorAll('article.card').forEach(move); }
  const mo=new MutationObserver(sweep); mo.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', sweep, {once:true}); else sweep();
})();
