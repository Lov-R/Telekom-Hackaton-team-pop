// A decorative welcome, independent of profile data and map/game state.
export function mountWelcomeBubbles({root,signal}) {
 let layer, timer;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 function clear(){clearTimeout(timer);layer?.remove();layer=null;}
 function welcome(event){
  if(event.detail?.welcome!==true||signal.aborted)return;
  clear();
  root.querySelector('.rg-brand-button')?.focus({preventScroll:true});
  if(motion.matches)return;
  layer=document.createElement('div');
  layer.className='rg-welcome-bubbles';
  layer.setAttribute('aria-hidden','true');
  layer.inert=true;
  const fragment=document.createDocumentFragment();
  for(let i=0;i<52;i++){
   const bubble=document.createElement('span');
   bubble.className='rg-welcome-bubble';
   // Spread the burst across the whole phone, with a ripple from bottom to top.
   const row=Math.floor(i/6),column=i%6;
   const size=i%13===0?142:30+(i*29)%76;
   const x=7+column*17+Math.sin(i*3.7)*7;
   const y=7+row*11+Math.cos(i*2.3)*4;
   const delay=Math.round((8-row)*65+(i%5)*70);
   bubble.style.cssText=`--bubble-x:${x}%;--bubble-y:${y}%;--bubble-size:${size}px;--bubble-delay:${delay}ms;--bubble-time:${1450+(i%4)*110}ms;--bubble-drift:${Math.sin(i*1.7)*44}px;--bubble-tilt:${(i%5-2)*11}deg`;
   const skin=document.createElement('i');skin.className='rg-welcome-bubble-skin';
   bubble.append(skin);fragment.append(bubble);
  }
  layer.append(fragment);root.append(layer);
  // Also clears when an OS/browser disables or interrupts CSS animations.
  timer=setTimeout(clear,2800);
 }
 root.addEventListener('relai:profile-saved',welcome,{signal});
 motion.addEventListener('change',()=>{if(motion.matches)clear();},{signal});
 signal.addEventListener('abort',clear,{once:true});
}
