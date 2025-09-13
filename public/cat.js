(function(){
  window.addEventListener('DOMContentLoaded', async ()=>{
    try {
      const res = await fetch('/api/kits',{credentials:'omit'});
      const data = await res.json();
      if(!data?.kits?.length) return;

      // unique categories
      const cats = [...new Set(data.kits.map(k=>(k.category||'').trim()).filter(Boolean))];
      if(!cats.length) return;

      const row = document.querySelector('#chipRow');
      if(!row) return;

      // already has All + On Demo; append after them
      cats.forEach(cat=>{
        const btn=document.createElement('button');
        btn.textContent=cat;
        btn.className='chip';
        btn.dataset.filter=cat.toLowerCase();
        btn.addEventListener('click',()=>{
          const want=cat.toLowerCase();
          const cards=document.querySelectorAll('#kitGrid .kit-card');
          cards.forEach(card=>{
            const has=(card.dataset.category||'').toLowerCase();
            card.style.display=(has===want)?'':'none';
          });
          row.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
        });
        row.appendChild(btn);
      });

      // ensure All works
      const allBtn=row.querySelector('[data-filter="all"]');
      if(allBtn){
        allBtn.addEventListener('click',()=>{
          row.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
          const cards=document.querySelectorAll('#kitGrid .kit-card');
          cards.forEach(c=>c.style.display='');
        });
      }
    } catch(e){console.error('chip error',e);}
  });
})();
