import {t,locale} from './i18n.js';
const GENDERS={female:['Ženski','Female'],male:['Muški','Male'],other:['Drugo','Other'],prefer_not:['Ne želim navesti','Prefer not to say']};
const genderLabel=id=>GENDERS[id]?t(...GENDERS[id]):'';

function yesterdayISO(){
 const date=new Date();date.setDate(date.getDate()-1);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// This remembers entry to the local UX demo, not an authenticated session.
export function canResumeProfile(state){
 const p=state?.profile;
 if(state?.prefs?.rememberMe!==true||!p)return false;
 if(!['firstName','lastName','username','birthDate','gender'].every(key=>typeof p[key]==='string'))return false;
 if(!p.firstName.trim()||!p.lastName.trim()||!Object.hasOwn(GENDERS,p.gender)||!/^[A-Za-z0-9_.]{3,24}$/.test(p.username))return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)||p.birthDate>yesterdayISO())return false;
 const date=new Date(`${p.birthDate}T12:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===p.birthDate;
}

// UI prototype only. Profile fields stay on this device; passwords never enter state.
export function createProfileUX({root,getState,persist,render,icon,esc,signal}){
 let mode='welcome';
 const dialog=document.createElement('dialog');
 dialog.className='rg-profile-dialog';root.append(dialog);
 const profile=()=>getState().profile||{};
 const text=(value)=>esc(String(value??''));
 function clearSecrets(){dialog.querySelectorAll('input[data-profile-secret]').forEach(input=>{input.value='';input.type='password';});}
 function close(){clearSecrets();if(dialog.open)dialog.close();dialog.innerHTML='';}
 function header(title,subtitle){return `<header class="rg-profile-dialog-header"><span class="rg-profile-wordmark">rel<span>AI</span></span>${mode!=='welcome'?`<button type="button" class="rg-profile-close" data-profile-close aria-label="${t("Zatvori","Close")}">${icon('x')}</button>`:''}<span class="rg-profile-eyebrow">${mode==='welcome'?t("TVOJ NOVI POČETAK","YOUR NEW BEGINNING"):mode==='password'?t("TVOJ RAČUN","YOUR ACCOUNT"):t("TVOJ PROFIL","YOUR PROFILE")}</span><h1 id="rg-profile-title">${title}</h1><p>${subtitle}</p></header>`;}
 function passwordField(name,label,autocomplete){return `<label class="rg-profile-field"><span>${label}</span><span class="rg-profile-password"><input type="password" data-profile-secret name="${name}" aria-label="${label}" required minlength="8" maxlength="128" autocomplete="${autocomplete}" placeholder="${t("Najmanje 8 znakova","At least 8 characters")}"><button type="button" data-profile-reveal="${name}" aria-label="${t('Prikaži lozinku ({label})','Show password ({label})',{label:label.toLocaleLowerCase(locale())})}" aria-pressed="false">${icon('eye')}</button></span></label>`;}
 function rememberChoice(settings=false){return `<label class="rg-profile-remember"><input type="checkbox" ${settings?'data-profile-remember':'name="rememberMe"'} ${getState().prefs?.rememberMe===true?'checked':''}><span><strong>${t('Zapamti me','Remember me')}</strong><small>${t('Na ovom uređaju','On this device')}</small></span></label>`;}
 function formMarkup(){
  const p=profile(),welcome=mode==='welcome';
  return `${header(welcome?t("Krenimo od tebe.","Let's start with you."):t("Tvoj profil.","Your profile."),welcome?t("Tvoj budući ti već je tu.","Your future self is already here."):t("Mali detalji koji te čine tobom.","The little details that make you, you."))}<form class="rg-profile-form" data-profile-form="${welcome?'welcome':'edit'}"><div class="rg-profile-form-row"><label class="rg-profile-field"><span>${t("Ime","First name")}</span><input name="firstName" autocomplete="given-name" required maxlength="60" value="${text(p.firstName)}" placeholder="${t("Tvoje ime","Your first name")}"></label><label class="rg-profile-field"><span>${t("Prezime","Last name")}</span><input name="lastName" autocomplete="family-name" required maxlength="80" value="${text(p.lastName)}" placeholder="${t("Tvoje prezime","Your last name")}"></label></div><div class="rg-profile-form-row"><label class="rg-profile-field"><span>${t("Datum rođenja","Date of birth")}</span><input type="date" name="birthDate" autocomplete="bday" required max="${yesterdayISO()}" value="${text(p.birthDate)}"></label><label class="rg-profile-field"><span>${t("Spol","Gender")}</span><select name="gender" aria-label="${t("Spol","Gender")}" autocomplete="sex" required><option value="" disabled ${!p.gender?'selected':''}>${t("Odaberi","Choose")}</option>${Object.entries(GENDERS).map(([value,label])=>`<option value="${value}" ${p.gender===value?'selected':''}>${genderLabel(value)}</option>`).join('')}</select></label></div><label class="rg-profile-field"><span>${t("Username","Username")}</span><span class="rg-profile-username-input"><b aria-hidden="true">@</b><input name="username" aria-label="${t("Username","Username")}" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.]{3,24}" title="${t("3–24 znaka: slova A–Z, brojevi, točka ili donja crta.","3–24 characters: A–Z letters, numbers, a dot or an underscore.")}" value="${text(p.username)}" placeholder="${t("tvoj.username","your.username")}"></span><small>${t("3–24 znaka · slova A–Z, brojevi, točka ili _","3–24 characters · A–Z letters, numbers, a dot or _")}</small></label>${welcome?passwordField('password',t("Lozinka","Password"),'new-password')+rememberChoice():''}<p class="rg-profile-local-note">${welcome?t("UX pregled · profil se sprema samo na ovom uređaju. Lozinka se ne sprema.","UX preview · your profile stays on this device. Your password is not saved."):t("Promjene se spremaju samo na ovom uređaju.","Changes are saved on this device only.")}</p><button type="submit" class="rg-profile-primary">${welcome?t("Zakorači na mapu","Step onto the map"):t("Spremi profil","Save profile")}${icon(welcome?'arrow-right':'check')}</button></form>`;
 }
 function passwordMarkup(){return `${header(t("Nova lozinka.","New password."),t("Tvoj prostor, tvoja pravila.","Your space, your rules."))}<form class="rg-profile-form" data-profile-form="password">${passwordField('currentPassword',t("Trenutačna lozinka","Current password"),'current-password')}${passwordField('newPassword',t("Nova lozinka","New password"),'new-password')}${passwordField('confirmPassword',t("Potvrdi novu lozinku","Confirm new password"),'new-password')}<p class="rg-profile-local-note">${t("UX pregled · trenutačna lozinka se ne provjerava. Lozinke se ne šalju ni spremaju.","UX preview · your current password is not verified. Passwords are never sent or saved.")}</p><button type="submit" class="rg-profile-primary">${t("Isprobaj promjenu","Try the change")}${icon('arrow-right')}</button></form>`;}
 function open(nextMode){
  if(signal.aborted)return;
  clearSecrets();mode=nextMode;dialog.classList.toggle('is-welcome',mode==='welcome');
  dialog.setAttribute('aria-labelledby','rg-profile-title');
  dialog.innerHTML=mode==='password'?passwordMarkup():formMarkup();
  if(!dialog.open)dialog.showModal();
  // Keep the full welcome visible on phones; the keyboard opens only on tap.
  const title=dialog.querySelector('h1');title.tabIndex=-1;title.focus({preventScroll:true});
  dialog.scrollTop=0;
 }
 function validate(form){
  const fields=form.elements;
  if(mode==='password'){
   if(fields.newPassword.value!==fields.confirmPassword.value)fields.confirmPassword.setCustomValidity(t("Lozinke se ne podudaraju.","Passwords do not match."));
  }else{
   for(const name of ['firstName','lastName']){fields[name].value=fields[name].value.trim();if(!fields[name].value)fields[name].setCustomValidity(name==='firstName'?t("Upiši ime.","Enter your first name."):t("Upiši prezime.","Enter your last name."));}
   fields.username.value=fields.username.value.trim();
   if(!/^[A-Za-z0-9_.]{3,24}$/.test(fields.username.value))fields.username.setCustomValidity(t("Koristi 3–24 znaka: slova A–Z, brojeve, točku ili donju crtu.","Use 3–24 characters: A–Z letters, numbers, a dot or an underscore."));
   const date=fields.birthDate.value,parsed=new Date(`${date}T12:00:00`);
   if(!date||!Number.isFinite(parsed.getTime())||date>yesterdayISO())fields.birthDate.setCustomValidity(t("Odaberi valjan datum rođenja u prošlosti.","Choose a valid birth date in the past."));
   if(!Object.hasOwn(GENDERS,fields.gender.value))fields.gender.setCustomValidity(t("Odaberi spol.","Choose a gender."));
  }
  return form.reportValidity();
 }
 dialog.addEventListener('submit',event=>{
  event.preventDefault();event.stopPropagation();
  const form=event.target;if(!form.matches('[data-profile-form]')||!validate(form))return;
  if(mode==='password'){
   clearSecrets();
   dialog.innerHTML=`${header(t("Spremno za povezivanje.","Ready to connect."),t("Tako će izgledati promjena lozinke.","This is how changing your password will look."))}<div class="rg-profile-password-result" role="status"><span>${icon('check')}</span><p>${t("UX pregled je dovršen. Nijedna stvarna lozinka nije promijenjena.","UX preview complete. No real password has been changed.")}</p><button type="button" class="rg-profile-primary" data-profile-close>${t("Natrag u postavke","Back to settings")}${icon('arrow-right')}</button></div>`;
   dialog.querySelector('[data-profile-close]')?.focus({preventScroll:true});return;
  }
  const f=form.elements,s=getState();
  s.profile={firstName:f.firstName.value.trim(),lastName:f.lastName.value.trim(),birthDate:f.birthDate.value,gender:f.gender.value,username:f.username.value.trim()};
  if(s.profile.gender==='male'||s.profile.gender==='female')s.avatar={...s.avatar,gender:s.profile.gender};
  if(mode==='welcome'){
   s.view='map';
   s.prefs={...s.prefs,rememberMe:f.rememberMe.checked};
  }
  clearSecrets();persist();close();render();
  root.dispatchEvent(new CustomEvent('relai:profile-saved',{detail:{welcome:mode==='welcome'}}));
 },{signal});
 dialog.addEventListener('input',event=>{
  if('setCustomValidity' in event.target)event.target.setCustomValidity('');
  if(event.target.name==='newPassword')dialog.querySelector('[name=confirmPassword]')?.setCustomValidity('');
 },{signal});
 dialog.addEventListener('change',event=>{if('setCustomValidity' in event.target)event.target.setCustomValidity('');},{signal});
 dialog.addEventListener('keydown',event=>event.stopPropagation(),{signal});
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-profile-close'))close();
  if(button.dataset.profileReveal){
   const input=dialog.querySelector(`[name="${button.dataset.profileReveal}"]`),visible=input.type==='password';
   input.type=visible?'text':'password';button.setAttribute('aria-pressed',String(visible));
   button.setAttribute('aria-label',visible?t('Sakrij lozinku','Hide password'):t('Prikaži lozinku','Show password'));
  }
 },{signal});
 dialog.addEventListener('cancel',event=>{if(mode==='welcome'){event.preventDefault();return;}clearSecrets();},{signal});
 dialog.addEventListener('close',()=>{clearSecrets();},{signal});
 root.addEventListener('click',event=>{
  const action=event.target.closest('[data-profile-action]')?.dataset.profileAction;
  if(action==='edit')open('edit');if(action==='password')open('password');
 },{signal});
 root.addEventListener('change',event=>{
  if(!event.target.matches('[data-profile-remember]'))return;
  const state=getState();state.prefs={...state.prefs,rememberMe:event.target.checked};
  persist();render();root.querySelector('[data-profile-remember]')?.focus({preventScroll:true});
 },{signal});
 signal.addEventListener('abort',()=>{clearSecrets();dialog.remove();},{once:true});
 function avatarProfile(){
  const p=profile();
  if(!p.username)return `<section class="rg-profile-summary"><span>${t("TVOJ PROFIL","YOUR PROFILE")}</span><h2>${t("Tvoj budući ti.","Your future self.")}</h2><button type="button" data-profile-action="edit">${t("Dodaj profil","Add profile")}${icon('arrow-right')}</button></section>`;
  const birthday=p.birthDate?new Date(`${p.birthDate}T12:00:00`):null;
  const date=birthday&&Number.isFinite(birthday.getTime())?birthday.toLocaleDateString(locale(),{day:'numeric',month:'numeric',year:'numeric'}):'';
  return `<section class="rg-profile-summary" aria-label="${t("Tvoj profil","Your profile")}"><button type="button" class="rg-profile-edit" data-profile-action="edit" aria-label="${t("Uredi profil","Edit profile")}">${icon('pencil')}</button><span>${t("TVOJ PROFIL","YOUR PROFILE")}</span><h2>@${text(p.username)}</h2><p>${text([p.firstName,p.lastName].filter(Boolean).join(' '))}</p><div class="rg-profile-chips">${date?`<span>${icon('calendar-days')}${text(date)}</span>`:''}${GENDERS[p.gender]?`<span>${icon('user-round')}${genderLabel(p.gender)}</span>`:''}</div></section>`;
 }
 function settingsSection(){const p=profile();return `<section class="rg-profile-settings" aria-labelledby="rg-profile-settings-title"><div><span>${t("TVOJ RAČUN","YOUR ACCOUNT")}</span><h2 id="rg-profile-settings-title">${p.username?'@'+text(p.username):t("Tvoj profil","Your profile")}</h2></div><button type="button" data-profile-action="edit"><span>${icon('user-round')}${t('Uredi profil','Edit profile')}</span>${icon('chevron-right')}</button><button type="button" data-profile-action="password"><span>${icon('lock-keyhole')}${t('Promijeni lozinku','Change password')}</span>${icon('chevron-right')}</button>${rememberChoice(true)}</section>`;}
 function openWelcome(){
  if(signal.aborted)return;
  const state=getState();
  if(!canResumeProfile(state)){open('welcome');return;}
  mode='welcome';close();state.view='map';persist();render();
  root.dispatchEvent(new CustomEvent('relai:profile-saved',{detail:{welcome:true,remembered:true}}));
 }
 return {openWelcome,openEdit:()=>open('edit'),openPassword:()=>open('password'),avatarProfile,settingsSection};
}
