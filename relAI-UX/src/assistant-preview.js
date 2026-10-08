import {t,getLanguage,locale,taskTitle} from './i18n.js';

function exampleReply(message,{tasks=[]}={}) {
 const lower=message.toLocaleLowerCase(locale());
 if(lower.includes('motiv')||lower.includes('pokren'))return t('Ne moraš riješiti sve odjednom. Daj si pet minuta za jedan mali korak. Ja sam tu — krenimo zajedno.','You don’t have to do everything at once. Give yourself five minutes for one small step. I’m here — let’s start together.');
 if(['previše','previse','puno','overwhelm','too many','too much'].some(word=>lower.includes(word)))return t('Hajdemo smanjiti gužvu. Odaberi ono što danas zaista mora biti gotovo, a ostalo ostavi za poslije. Koji zadatak ti je najviše na umu?','Let’s make some space. Choose what really needs to be done today and leave the rest for later. Which task is on your mind the most?');
 const next=tasks.filter(task=>task.status==='pending').sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0];
 return next?t('Možemo krenuti od „{task}”. Razbij ga na jedan korak koji možeš napraviti sada. Zatim si ostavi malo prostora za predah.','We can start with “{task}”. Break it down into one step you can take now. Then leave yourself a little room to breathe.',{task:taskTitle(next)}):t('Danas si napravio mjesta za sebe. Dodaj svoj sljedeći mali korak kad budeš spreman.','You’ve made room for yourself today. Add your next small step whenever you’re ready.');
}

// UX-only adapter. Replace this function with the authenticated Cloud/SSE adapter.
// It sends nothing to a server and never changes tasks, HP, XP or calendar events.
export async function previewAssistantReply(message,state={}) {return exampleReply(message,state);}

export function createAvatarChat({root,getState,icon,esc,signal}) {
 let messages=[],head='',busy=false,timer;
 const dialog=document.createElement('dialog');dialog.className='rg-assistant';root.append(dialog);
 const greeting=()=>t('Hej, tu sam — tvoj budući ti. Koji mali korak danas možemo napraviti zajedno?','Hey, I’m here — your future self. What small step can we take together today?');
 const prompts=()=>[t('Od čega da krenem?','Where should I start?'),t('Treba mi motivacija','I need motivation'),t('Imam previše zadataka','I have too many tasks')];
 function messageText(message){
  if(message.role==='user')return message.text;
  if(message.greeting)return greeting();
  // Only local assistant examples are translated; the user's own words stay intact.
  return message.language===getLanguage()?message.text:exampleReply(message.prompt,{tasks:message.tasks});
 }
 function bubbles(){return messages.map((m,index)=>`<div class="rg-message-row ${m.role==='user'?'is-user':'is-assistant'}" data-chat-message="${index}">${m.role==='assistant'?`<span class="rg-message-avatar">${head}</span>`:''}<div class="rg-message ${m.role==='user'?'is-user':'is-assistant'}"><span>${m.role==='user'?t('TI','YOU'):t('TVOJ BUDUĆI TI','YOUR FUTURE SELF')}</span><p>${esc(messageText(m))}</p></div></div>`).join('');}
 function translate(){
  dialog.setAttribute('aria-label',t('Asistent tvog budućeg sebe','Your future self assistant'));
  if(!dialog.firstElementChild)return;
  dialog.querySelector('.rg-chat-header h2').innerHTML=t('Tvoj budući ti<br>asistent','Your future self<br>assistant');
  dialog.querySelector('.rg-chat-header>div>span').textContent=t('Tu za tvoj sljedeći korak.','Here for your next step.');
  dialog.querySelector('[data-chat-close]').setAttribute('aria-label',t('Zatvori chat','Close chat'));
  dialog.querySelector('.rg-chat-demo').textContent=t('UX pregled · AI još nije povezan','UX preview · AI is not connected yet');
  dialog.querySelector('.rg-chat-messages').setAttribute('aria-label',t('Razgovor','Conversation'));
  dialog.querySelector('.rg-chat-typing')?.setAttribute('aria-label',t('Avatar priprema primjer odgovora','Your avatar is preparing an example reply'));
  dialog.querySelectorAll('[data-chat-message]').forEach(row=>{const m=messages[Number(row.dataset.chatMessage)];row.querySelector('.rg-message>span').textContent=m.role==='user'?t('TI','YOU'):t('TVOJ BUDUĆI TI','YOUR FUTURE SELF');row.querySelector('.rg-message p').textContent=messageText(m);});
  const choices=prompts();dialog.querySelectorAll('[data-chat-prompt]').forEach((b,index)=>{b.dataset.chatPrompt=choices[index];b.textContent=choices[index];});
  dialog.querySelector('label[for="rg-chat-input"]').textContent=t('Poruka tvom budućem sebi','Message your future self');
  dialog.querySelector('#rg-chat-input').placeholder=t('Reci mi što ti je na umu…','Tell me what’s on your mind…');
  dialog.querySelector('[type=submit]').setAttribute('aria-label',t('Pošalji poruku','Send message'));
 }
 function paint(){
  dialog.innerHTML=`<header class="rg-chat-header">${head}<div><h2></h2><span></span></div><button type="button" data-chat-close>${icon('x')}</button></header><div class="rg-chat-demo"></div><div class="rg-chat-messages" role="log" aria-live="polite">${bubbles()}${busy?`<div class="rg-chat-typing"><span class="rg-message-avatar">${head}</span><i></i><i></i><i></i></div>`:''}</div><div class="rg-chat-prompts">${prompts().map(prompt=>`<button type="button" data-chat-prompt="${esc(prompt)}" ${busy?'disabled':''}>${prompt}</button>`).join('')}</div><form class="rg-chat-compose"><label for="rg-chat-input" class="rg-sr-only"></label><input id="rg-chat-input" name="message" autocomplete="off" maxlength="1000" ${busy?'disabled':''}><button type="submit" ${busy?'disabled':''}>${icon('arrow-right')}</button></form>`;
  translate();
  const log=dialog.querySelector('.rg-chat-messages');log.scrollTop=log.scrollHeight;
 }
 async function send(text){
  if(busy||!text.trim())return;
  const prompt=text.trim(),tasks=getState().tasks.map(task=>({...task})),language=getLanguage();
  messages.push({role:'user',text:prompt});busy=true;paint();
  const reply=await previewAssistantReply(prompt,{tasks});
  if(signal.aborted)return;
  timer=setTimeout(()=>{busy=false;messages.push({role:'assistant',text:reply,prompt,tasks,language});if(dialog.open){paint();dialog.querySelector('input')?.focus({preventScroll:true});}},450);
 }
 dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-chat-close'))dialog.close();if(b.dataset.chatPrompt)send(b.dataset.chatPrompt);},{signal});
 dialog.addEventListener('keydown',e=>{if(e.target.matches('input'))e.stopPropagation();},{signal});
 dialog.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();send(new FormData(e.target).get('message')||'');},{signal});
 root.addEventListener('relai:language-changed',translate,{signal});
 signal.addEventListener('abort',()=>{clearTimeout(timer);dialog.remove();},{once:true});
 return {open(portrait){head=portrait;if(!messages.length)messages.push({role:'assistant',greeting:true});paint();dialog.showModal();}};
}
