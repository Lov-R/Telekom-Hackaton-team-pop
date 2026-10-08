import {t} from './i18n.js';
const INTRO='/game/intro-v6.png';

// The animated wordmark is the entry control; the backdrop is decorative.
export function mountMysticIntro({root,signal,onEnter}) {
 let dialog, timer;
 root.dataset.inputMethod='pointer';
 root.addEventListener('pointerdown',()=>{root.dataset.inputMethod='pointer';},{signal});
 root.addEventListener('keydown',e=>{if(e.key==='Tab')root.dataset.inputMethod='keyboard';},{signal});
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function translate(){
  if(!dialog)return;
  dialog.setAttribute('aria-label',t('Dobrodošli u relAI','Welcome to relAI'));
  dialog.querySelector('.rg-intro-image').alt=t('Plavi tragovi prstiju približavaju se i blijede na zamagljenom staklu','Blue fingertip traces approach and fade on frosted glass');
  dialog.querySelector('.rg-intro-logo-button').setAttribute('aria-label',t('relAI · Nastavi','relAI · Continue'));
  dialog.querySelector('.rg-intro-subtitle').innerHTML=t('Na budućeg sebe se <br>uvijek možeš osloniti.','You can always rely <br>on your future self.');
  const hint=dialog.querySelector('.rg-intro-hint');hint.firstChild.textContent=t('DODIRNI relAI','TAP relAI');hint.querySelector('span').textContent=t('i napravi prvi korak','and take your first step');
 }
 function finish(){
  clearTimeout(timer);
  if(!dialog)return;
  dialog.close();dialog.remove();dialog=null;
  root.classList.add('rg-revealed');
  if(onEnter)onEnter();else root.querySelector('.rg-brand-button')?.focus({preventScroll:true});
 }
 function enter(){
  if(!dialog||dialog.classList.contains('is-leaving'))return;
  dialog.classList.add('is-leaving');
  dialog.querySelector('button').disabled=true;
  if(reduced()){finish();return;}
  dialog.addEventListener('transitionend',e=>{if(e.target===dialog)finish();},{once:true,signal});
  timer=setTimeout(finish,1100);
 }
 function show(){
  if(signal.aborted||dialog)return;
  root.classList.remove('rg-revealed');
  dialog=document.createElement('dialog');
  dialog.className='rg-intro';
  dialog.innerHTML=`<div class="rg-intro-enter"><img class="rg-intro-image" src="${INTRO}" alt="" fetchpriority="high"><span class="rg-intro-haze" aria-hidden="true"></span><span class="rg-intro-title"><button type="button" class="rg-intro-logo-button"><strong class="rg-animated-logo" aria-hidden="true"><span>r</span><span>e</span><span>l</span><span>A</span><span>I</span></strong></button><span class="rg-intro-subtitle"></span></span><span class="rg-intro-hint"> <span></span></span></div>`;
  translate();
  root.append(dialog);
  dialog.addEventListener('click',e=>{if(e.target.closest('.rg-intro-logo-button'))enter();},{signal});
  dialog.addEventListener('cancel',e=>{e.preventDefault();enter();},{signal});
  dialog.showModal();
 }
 root.addEventListener('relai:intro',show,{signal});
 root.addEventListener('relai:language-changed',translate,{signal});
 signal.addEventListener('abort',()=>{clearTimeout(timer);dialog?.remove();dialog=null;},{once:true});
 show();
}
