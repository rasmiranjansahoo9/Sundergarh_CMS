document.addEventListener("DOMContentLoaded",function(){
  const buttons=[...document.querySelectorAll(".dest-filter")];
  const cards=[...document.querySelectorAll(".destination-card")];
  buttons.forEach(btn=>btn.addEventListener("click",()=>{const filter=btn.dataset.filter;buttons.forEach(b=>b.classList.toggle("active",b===btn));cards.forEach(card=>{const type=card.dataset.type||"";card.classList.toggle("hidden",filter!=="all"&&!type.includes(filter));});}));

  const slides=[...document.querySelectorAll(".eco-slide")];
  const dots=document.getElementById("ecoDots");
  const current=document.getElementById("ecoSlideCurrent");
  const total=document.getElementById("ecoSlideTotal");
  const progress=document.getElementById("ecoProgress");
  const slider=document.getElementById("ecoPhotoSlider");
  if(!slides.length)return;
  let index=0,timer=null,paused=false,duration=5200;
  total.textContent=String(slides.length).padStart(2,"0");
  slides.forEach((_,i)=>{const d=document.createElement("button");d.type="button";d.setAttribute("aria-label","Show photo "+(i+1));d.addEventListener("click",()=>go(i));dots.appendChild(d);});
  function render(){slides.forEach((s,i)=>s.classList.toggle("active",i===index));[...dots.children].forEach((d,i)=>d.classList.toggle("active",i===index));current.textContent=String(index+1).padStart(2,"0");progress.style.transition="none";progress.style.width="0";requestAnimationFrame(()=>{progress.style.transition="width "+duration+"ms linear";progress.style.width="100%";});}
  function go(i){index=(i+slides.length)%slides.length;render();restart();}
  function next(){go(index+1)} function prev(){go(index-1)}
  function start(){clearInterval(timer);timer=setInterval(()=>{if(!paused)next()},duration)} function restart(){start()}
  document.getElementById("ecoNext").addEventListener("click",next);document.getElementById("ecoPrev").addEventListener("click",prev);
  slider.addEventListener("mouseenter",()=>{paused=true});slider.addEventListener("mouseleave",()=>{paused=false});slider.addEventListener("focusin",()=>{paused=true});slider.addEventListener("focusout",()=>{paused=false});
  slider.addEventListener("keydown",e=>{if(e.key==="ArrowRight")next();if(e.key==="ArrowLeft")prev()});
  let sx=0;slider.addEventListener("touchstart",e=>sx=e.changedTouches[0].screenX,{passive:true});slider.addEventListener("touchend",e=>{const dx=e.changedTouches[0].screenX-sx;if(Math.abs(dx)>45){dx<0?next():prev()}});
  render();start();
});