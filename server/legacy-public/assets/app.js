
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
function toggleMenu(){document.querySelector('.nav')?.classList.toggle('open')}
function setActive(){let p=location.pathname.split('/').pop()||'index.html';$$('.nav a').forEach(a=>{if(a.getAttribute('href')===p)a.classList.add('active')})}
function counter(){ $$('.stat strong[data-target]').forEach(el=>{let t=+el.dataset.target, n=0, step=Math.max(1,Math.ceil(t/60));let id=setInterval(()=>{n+=step;if(n>=t){n=t;clearInterval(id)}el.textContent=n.toLocaleString()},20)})}
function siteSearch(){let q=$('#siteSearch')?.value.trim();if(q) location.href='pages/search.html?q='+encodeURIComponent(q)}
document.addEventListener('DOMContentLoaded',()=>{setActive();counter();let f=$('#year');if(f)f.textContent=new Date().getFullYear();$$('[data-search]').forEach(inp=>inp.addEventListener('input',()=>{let q=inp.value.toLowerCase();let cards=$$('[data-item]');cards.forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?'':'none')}))});

// Home hero carousel
document.addEventListener('DOMContentLoaded',()=>{
  const c=document.getElementById('heroCarousel');
  if(!c)return;
  const slides=[...c.querySelectorAll('.hero-slide')];
  const dots=[...c.querySelectorAll('.hero-dot')];
  const prev=c.querySelector('.hero-control.prev');
  const next=c.querySelector('.hero-control.next');
  const progressBar=document.getElementById('heroProgress');
  if(!slides.length)return;
  let index=0,timer=null,raf=null,start=0;
  const duration=6500;
  function updateProgress(){
    cancelAnimationFrame(raf);
    if(!progressBar)return;
    progressBar.style.width='0%';
    start=performance.now();
    const tick=(now)=>{
      const pct=Math.min(100,((now-start)/duration)*100);
      progressBar.style.width=pct+'%';
      if(pct<100)raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  }
  function showSlide(nextIndex){
    index=(nextIndex+slides.length)%slides.length;
    slides.forEach((slide,i)=>slide.classList.toggle('active',i===index));
    dots.forEach((dot,i)=>{dot.classList.toggle('active',i===index);dot.setAttribute('aria-current',i===index?'true':'false')});
    updateProgress();
  }
  function startAutoplay(){
    clearInterval(timer);
    timer=setInterval(()=>showSlide(index+1),duration);
    updateProgress();
  }
  function stopAutoplay(){clearInterval(timer);timer=null;cancelAnimationFrame(raf);}
  prev?.addEventListener('click',()=>{showSlide(index-1);startAutoplay()});
  next?.addEventListener('click',()=>{showSlide(index+1);startAutoplay()});
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>{showSlide(i);startAutoplay()}));
  c.addEventListener('mouseenter',stopAutoplay);
  c.addEventListener('mouseleave',startAutoplay);
  let touchStartX=0;
  c.addEventListener('touchstart',e=>{touchStartX=e.changedTouches[0].clientX;stopAutoplay()},{passive:true});
  c.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-touchStartX;
    if(Math.abs(dx)>45)showSlide(index+(dx<0?1:-1));
    startAutoplay();
  },{passive:true});
  c.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'){showSlide(index-1);startAutoplay()}
    if(e.key==='ArrowRight'){showSlide(index+1);startAutoplay()}
  });
  showSlide(0);
  startAutoplay();
});


// Accessibility text-size controls
document.addEventListener('DOMContentLoaded',()=>{
  const body=document.body;
  const saved=localStorage.getItem('sundergarh-font-scale');
  if(saved){body.style.setProperty('--font-scale',saved);if(saved==='1.12')body.classList.add('font-large')}
  $$('[data-font]').forEach(btn=>btn.addEventListener('click',()=>{
    const action=btn.dataset.font;
    let scale=parseFloat(getComputedStyle(body).getPropertyValue('--font-scale'))||1;
    if(action==='up') scale=Math.min(1.12,+(scale+0.06).toFixed(2));
    if(action==='down') scale=Math.max(0.94,+(scale-0.06).toFixed(2));
    if(action==='reset') scale=1;
    body.style.setProperty('--font-scale',scale);
    body.classList.toggle('font-large',scale>1);
    localStorage.setItem('sundergarh-font-scale',String(scale));
  }));
});
