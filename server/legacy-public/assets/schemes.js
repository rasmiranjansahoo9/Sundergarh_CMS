document.addEventListener('DOMContentLoaded', function(){
  const tabs=[...document.querySelectorAll('.scheme-tab')];
  const cards=[...document.querySelectorAll('.scheme-card')];
  tabs.forEach(tab=>tab.addEventListener('click',()=>{
    const filter=tab.dataset.filter||'all';
    tabs.forEach(t=>t.classList.toggle('active',t===tab));
    cards.forEach(card=>card.classList.toggle('hidden',filter!=='all' && card.dataset.type!==filter));
  }));
  const counters=[...document.querySelectorAll('[data-count]')];
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const el=entry.target; const target=Number(el.dataset.count||0); let start=0; const step=Math.max(1,Math.ceil(target/35));
      const tick=()=>{start=Math.min(target,start+step);el.textContent=start.toLocaleString();if(start<target)requestAnimationFrame(tick)}; tick(); observer.unobserve(el);
    });
  },{threshold:.5});
  counters.forEach(el=>observer.observe(el));
});
