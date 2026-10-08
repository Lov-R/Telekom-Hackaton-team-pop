import {t,locale,taskTitle} from './i18n.js';
import {proofStore,preparePhoto} from './evidence.js';

// A validity date is a local calendar date, never a midnight UTC timestamp.
function calendarDate(value){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');
  if(!match)return null;
  const [,year,month,day]=match.map(Number);
  if(year<1||month<1||month>12||day<1||day>31)return null;
  const result=new Date(0);result.setFullYear(year,month-1,day);result.setHours(12,0,0,0);
  return result.getFullYear()===year&&result.getMonth()===month-1&&result.getDate()===day?result:null;
}
export function documentExpiry(value,today=new Date()){
  const expires=calendarDate(value);if(!expires)return null;
  const dayNumber=date=>{const d=new Date(0);d.setUTCFullYear(date.getFullYear(),date.getMonth(),date.getDate());d.setUTCHours(0,0,0,0);return d.getTime()/86400000;};
  const days=dayNumber(expires)-dayNumber(today);
  const formatted=new Intl.DateTimeFormat(locale(),{day:'numeric',month:'numeric',year:'numeric'}).format(expires);
  const status=days<0?'expired':days<=30?'soon':'valid';
  const label=days<0?t('Isteklo','Expired'):days===0?t('Istječe danas','Expires today'):days===1?t('Istječe sutra','Expires tomorrow'):days<=30?t('Još {days} d','{days} days left',{days}):t('Do {date}','Until {date}',{date:formatted});
  return {days,status,label,description:days<0?t('Isteklo {date}','Expired {date}',{date:formatted}):t('Vrijedi do {date}','Valid until {date}',{date:formatted})};
}

// Presentation controller. Replace the local store with the backend contract later.
export function createDocumentLibrary({root,getState,persist,notify,render,esc,icon,signal,categories}) {
  let filter='all',categoryFilter='',query='',sort='newest',busy=false,epoch=0,urls=[],bubbleObserver;
  const samples=[
    {id:'sample-car',name:'Registracija auta.pdf',mime:'application/pdf',taskId:'car',categoryId:'personal',sample:true,caption:'Manje papira. Više mira.'},
    {id:'sample-walk',name:'Moj mali jutarnji reset',mime:'image/jpeg',taskId:'walk',categoryId:'self',sample:true,caption:'Jedan korak bliže sebi.'},
    {id:'sample-notes',name:'Bilješke za sastanak.pdf',mime:'application/pdf',taskId:'meeting',categoryId:'work',sample:true,caption:'Sve spremno za sljedeći korak.'}
  ];
  const sampleText={
    'sample-car':['Registracija auta.pdf','Car registration.pdf','Manje papira. Više mira.','Less paperwork. More peace.'],
    'sample-walk':['Moj mali jutarnji reset','My little morning reset','Jedan korak bliže sebi.','One step closer to yourself.'],
    'sample-notes':['Bilješke za sastanak.pdf','Meeting notes.pdf','Sve spremno za sljedeći korak.','Ready for the next step.']
  };
  const documentName=d=>d.sample&&sampleText[d.id]?t(sampleText[d.id][0],sampleText[d.id][1]):d.name;
  const documentCaption=d=>d.sample&&sampleText[d.id]?t(sampleText[d.id][2],sampleText[d.id][3]):d.caption;
  const fileCount=count=>t('{count} datoteka',count===1?'{count} file':'{count} files',{count});
  const bytes=n=>n>1024*1024?(n/1024/1024).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
  const isImage=d=>d.mime?.startsWith('image/');
  const taskFor=d=>getState().tasks.find(task=>task.id===d.taskId);
  const date=d=>d.createdAt?new Intl.DateTimeFormat(locale(),{day:'numeric',month:'short'}).format(new Date(d.createdAt)):t("PRIMJER KARTICE","EXAMPLE CARD");
  const categoryId=d=>Object.prototype.hasOwnProperty.call(d,'categoryId')?(d.categoryId||''):d.fromProof?(categories?.idForTask(taskFor(d))||''):'';
  const categoryLabel=d=>categories?.label(categoryId(d))||t("Nerazvrstano","Uncategorized");
  const categoryOptions=(selected,all=false)=>categories?.options(selected,{all})||`<option value="">${all?t("Sve kategorije","All categories"):t("Nerazvrstano","Uncategorized")}</option>`;
  const storedDocument=id=>getState().documents?.find(d=>d.id===id)||getState().tasks.find(task=>task.proof?.id===id)?.proof;
  const feedback=message=>{const el=root.querySelector('[data-doc-feedback]');if(el)el.textContent=message;};
  const expiryMarkup=expiry=>expiry?`<span class="fs-doc-expiry is-${expiry.status}" title="${esc(expiry.description)}" aria-label="${esc(expiry.description)}">${esc(expiry.label)}</span>`:'';
  function entries(){
    const state=getState(),docs=state.documents||[];
    return [...docs,...state.tasks.filter(task=>task.proof&&!docs.some(d=>d.id===task.proof.id)).map(task=>({...task.proof,name:task.proof.name||t('Dokaz · {title}','Proof · {title}',{title:taskTitle(task)}),taskId:task.id,fromProof:true}))];
  }
  function card(d){
    const label=categoryLabel(d),shortLabel=label.split('›').pop().trim(),expiry=documentExpiry(d.expiresOn);
    return `<article class="fs-doc-card fs-doc-bubble ${d.sample?'is-example':''} ${isImage(d)?'is-photo':'is-pdf'}" data-doc-bubble><button type="button" class="fs-doc-open" data-doc-open="${esc(d.id)}" aria-label="${t('Otvori','Open')} ${esc(documentName(d))}${d.sample?t(" · primjer"," · example"):''}${expiry?' · '+esc(expiry.description):''}">${isImage(d)&&!d.sample?`<img class="fs-doc-bubble-photo" data-doc-thumb="${esc(d.id)}" alt="" hidden>`:''}<div class="fs-doc-bubble-content"><span class="fs-doc-bubble-type">${icon(isImage(d)?'image':'file-text')}<span>${isImage(d)?t("FOTO","PHOTO"):'PDF'}</span></span><h3>${esc(documentName(d))}</h3><span class="fs-doc-bubble-meta" title="${esc(label)}">${d.sample?t("Primjer · ","Example · "):''}${esc(shortLabel)}</span>${expiry?expiryMarkup(expiry):`<span class="fs-doc-bubble-arrow" aria-hidden="true">${icon('arrow-up-right')}</span>`}</div></button>${!d.sample?`<button class="fs-doc-pin ${d.pinned?'is-pinned':''}" type="button" data-doc-pin="${esc(d.id)}" aria-label="${d.pinned?t("Ukloni iz favorita","Remove from favourites"):t("Dodaj u favorite","Add to favourites")}: ${esc(documentName(d))}" aria-pressed="${!!d.pinned}">${icon('star')}</button>`:''}</article>`;
  }
  function matches(d){
    const typeMatches=filter==='all'||filter==='photos'&&isImage(d)||filter==='pdf'&&!isImage(d)||filter==='pinned'&&d.pinned;
    const categoryMatches=!categoryFilter||(categories?.matches(categoryId(d),categoryFilter)??categoryId(d)===categoryFilter);
    return typeMatches&&categoryMatches&&`${documentName(d)} ${taskFor(d)?taskTitle(taskFor(d)):''} ${categoryLabel(d)}`.toLocaleLowerCase(locale()).includes(query.toLocaleLowerCase(locale()));
  }
  function grid(){const all=entries();const filtered=all.filter(matches).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,locale()):String(b.createdAt).localeCompare(String(a.createdAt)));return filtered.length?filtered.map(card).join(''):`<div class="fs-doc-empty">${icon(all.length?'search':'folder-open')}<h3>${all.length?t("Nema rezultata.","No results."):t("Tvoja zbirka još je prazna.","Your collection is waiting.")}</h3><p>${all.length?t("Pokušaj drugi naziv ili ukloni filtre.","Try another name or clear the filters."):t("Dodaj dokument i pronađi ga u svom mjehuriću.","Add a document and find it in its own bubble.")}</p>${all.length?`<button type="button" class="fs-secondary" data-doc-action="clear">${t("Očisti filtre","Clear filters")}</button>`:''}</div>`;}
  function view(){if(categoryFilter&&!getState().categories?.some(c=>c.id===categoryFilter))categoryFilter='';const all=entries();return `<div class="fs-doc-intro"><span>${icon('lock-keyhole')}${t('Samo za tebe','Just for you')}</span><span>${fileCount(all.length)}</span></div><section class="fs-doc-toolbar" aria-label="${t("Organizacija dokumenata","Document organization")}"><div class="fs-doc-tabs" role="group" aria-label="${t("Vrsta dokumenta","Document type")}">${[['all',t("Sve","All"),all.length],['photos',t("Fotografije","Photos"),all.filter(isImage).length],['pdf','PDF',all.filter(d=>!isImage(d)).length],['pinned',t("Favoriti","Favourites"),all.filter(d=>d.pinned).length]].map(([v,n,c])=>`<button type="button" data-doc-filter="${v}" aria-pressed="${filter===v}">${n}<span>${c}</span></button>`).join('')}</div><div class="fs-doc-category-tools"><label class="fs-doc-category-filter">${t("Kategorija","Category")}<select data-doc-category-filter aria-label="${t("Filtriraj dokumente po kategoriji","Filter documents by category")}">${categoryOptions(categoryFilter,true)}</select></label><button type="button" class="fs-doc-manage-categories" data-category-manage aria-label="${t("Uredi kategorije","Edit categories")}">${icon('settings')}<span>${t("Uredi","Edit")}</span></button></div><div class="fs-doc-tools"><label class="fs-doc-search">${icon('search')}<input type="search" data-doc-search aria-label="${t("Pretraži dokumente","Search documents")}" placeholder="${t("Pretraži…","Search…")}" value="${esc(query)}"></label><select data-doc-sort aria-label="${t("Poredaj dokumente","Sort documents")}"><option value="newest" ${sort==='newest'?'selected':''}>${t("Najnovije","Newest")}</option><option value="name" ${sort==='name'?'selected':''}>${t("Naziv A–Ž","Name A–Z")}</option></select></div></section><label class="fs-doc-drop ${busy?'is-busy':''}" data-doc-drop>${icon('upload')}<span><strong>${busy?t("Spremam…","Saving…"):t("Dodaj datoteke","Add files")}</strong><small>${t("PDF ili fotografija · do 8 MB · na ovom uređaju","PDF or photo · up to 8 MB · on this device")}</small></span><span class="fs-doc-drop-plus">+</span><input type="file" data-doc-files multiple accept="application/pdf,image/jpeg,image/png,image/webp" aria-label="${t("Dodaj dokumente ili fotografije","Add documents or photos")}" ${busy?'disabled':''}></label><div class="fs-section-heading fs-doc-results"><h2>${t("Tvoja zbirka","Your collection")}</h2><span class="fs-sub" data-doc-result-count>${fileCount(all.filter(matches).length)}</span></div><div class="fs-doc-grid" data-doc-grid>${grid()}</div>${!all.length?`<section class="fs-doc-examples"><div class="fs-section-heading"><h2>${t("Zaviri u primjer","Take a look")}</h2></div><div class="fs-doc-grid">${samples.map(card).join('')}</div><p class="fs-small-print">${t("Primjeri dizajna, nisu tvoji dokumenti.","Design examples, not your documents.")}</p></section>`:''}<dialog class="fs-doc-dialog" aria-labelledby="fs-doc-dialog-title"></dialog>`;}
  async function loadImage(img,id,current){try{const blob=await proofStore.get(id);if(!blob||current!==epoch||signal.aborted||!img.isConnected)return;const url=URL.createObjectURL(blob);urls.push(url);img.src=url;img.hidden=false;}catch{/* Keep the readable file card if local storage is unavailable. */}}
  function hydrate(){
    epoch++;urls.forEach(URL.revokeObjectURL);urls=[];
    root.querySelectorAll('[data-doc-thumb]').forEach(img=>loadImage(img,img.dataset.docThumb,epoch));
    bubbleObserver?.disconnect();
    const bubbles=[...root.querySelectorAll('[data-doc-bubble]:not(.is-revealed)')];
    if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches){bubbles.forEach(b=>b.classList.add('is-revealed'));return;}
    // Reveal each newly visible batch in reading order, including bubbles below the fold.
    bubbleObserver=new IntersectionObserver(items=>{
      items.filter(item=>item.isIntersecting).sort((a,b)=>bubbles.indexOf(a.target)-bubbles.indexOf(b.target)).forEach((item,index)=>{
        item.target.style.setProperty('--doc-pop-delay',`${index*180}ms`);
        item.target.classList.add('is-revealed');bubbleObserver.unobserve(item.target);
      });
    },{threshold:.2,rootMargin:'0px 0px -65px 0px'});
    bubbles.forEach(b=>bubbleObserver.observe(b));
  }
  function refreshGrid(){const el=root.querySelector('[data-doc-grid]');if(!el)return;el.innerHTML=grid();root.querySelector('[data-doc-result-count]').textContent=fileCount(entries().filter(matches).length);hydrate();}
  async function addFiles(files){if(busy)return;const uploadCategory=categoryFilter;busy=true;render();let count=0,errors=[];for(const file of [...files].slice(0,20)){try{if(file.size>8*1024*1024)throw new Error(t("Najviše 8 MB po datoteci.","Maximum 8 MB per file."));const id=crypto.randomUUID();let blob,mime;if(file.type==='application/pdf'){const header=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());if(header!=='%PDF-')throw new Error(t("Datoteka nije valjani PDF.","This file is not a valid PDF."));blob=file;mime=file.type;}else{const photo=await preparePhoto(file);blob=photo.blob;mime=photo.mime;}await proofStore.put(id,blob);const state=getState();state.documents??=[];state.documents.push({id,name:file.name,mime,size:blob.size,createdAt:new Date().toISOString(),taskId:null,pinned:false,categoryId:uploadCategory,expiresOn:null});count++;persist();}catch(error){errors.push(file.name+': '+error.message);}}busy=false;filter='all';query='';render();notify(`${count?t('Spremljeno: {count} datoteka. ','Saved: {count} files. ',{count}):''}${errors.join(' ')||t("Tvoja zbirka je ažurirana.","Your collection is up to date.")}`);}
  async function open(id){const d=entries().find(d=>d.id===id)||samples.find(d=>d.id===id);if(!d)return;const dialog=root.querySelector('.fs-doc-dialog');if(!dialog)return;const task=taskFor(d);dialog.innerHTML=`<div class="fs-doc-dialog-head"><span class="fs-tiny">${d.sample?t("UX PRIMJER","UX EXAMPLE"):isImage(d)?t("FOTOGRAFIJA","PHOTO"):t("PDF DOKUMENT","PDF DOCUMENT")}</span><button type="button" data-doc-action="close" class="fs-icon-button" aria-label="${t("Zatvori pregled","Close preview")}">${icon('x')}</button></div><h2 id="fs-doc-dialog-title">${esc(documentName(d))}</h2><div class="fs-doc-preview" data-doc-preview>${d.sample?`<div class="fs-doc-sample-sheet">${icon(isImage(d)?'image':'file-text')}<h3>${esc(documentCaption(d))}</h3><p>${isImage(d)?t('Mjesto za pregled tvoje fotografije.','Your photo preview appears here.'):t('Mjesto za pregled tvoje datoteke.','Your file preview appears here.')}</p><span>${t("PRIMJER DIZAJNA","DESIGN EXAMPLE")}</span></div>`:t("Učitavam pregled…","Loading preview…")}</div><div class="fs-doc-dialog-meta"><span>${d.sample?t("Primjerni sadržaj","Sample content"):bytes(d.size)}</span><span>${date(d)}</span><span>${icon('lock-keyhole')}${t('Privatno','Private')}</span></div>${d.sample?`<p class="fs-sub">${t("Dodaj vlastitu datoteku da isprobaš pravi pregled, povezivanje sa zadatkom i preuzimanje.","Add your own file to try previews, task links and downloads.")}</p>`:`<div class="fs-doc-edit-meta"><label class="fs-field">${t("Kategorija","Category")}<select data-doc-category="${esc(id)}" aria-label="${t("Kategorija dokumenta","Document category")}">${categoryOptions(categoryId(d))}</select></label><label class="fs-field"><span>${t('Rok valjanosti','Expiry date')} <small>${t("(neobavezno)","(optional)")}</small></span><input type="date" aria-label="${t("Rok valjanosti","Expiry date")}" data-doc-expiry="${esc(id)}" value="${esc(calendarDate(d.expiresOn)?d.expiresOn:'')}" max="9999-12-31" aria-describedby="fs-doc-expiry-help"></label><p id="fs-doc-expiry-help" class="fs-doc-expiry-help">${d.expiresOn&&documentExpiry(d.expiresOn)?esc(documentExpiry(d.expiresOn).description):t("Dodaj datum za dokumente koji imaju rok valjanosti.","Add a date for documents with an expiry date.")}</p></div><label class="fs-field">${d.fromProof?t("Dokaz za zadatak","Proof for task"):t("Poveži sa zadatkom","Link to a task")}<select data-doc-link="${esc(id)}" ${d.fromProof?'disabled':''}><option value="">${t("Bez povezanog zadatka","No linked task")}</option>${getState().tasks.map(task=>`<option value="${esc(task.id)}" ${task.id===d.taskId?'selected':''}>${esc(taskTitle(task))}</option>`).join('')}</select></label><p class="fs-small-print">${d.fromProof?t("Fotografija je priložena u zadatku.","The photo is attached to this task."):t("Povezivanje organizira datoteke; zadatak se dovršava u njegovu detalju.","Linking keeps files organized; complete the task in its details.")}</p>`}<div class="fs-actions">${task?`<button type="button" class="fs-secondary" data-doc-task="${esc(task.id)}">${icon('link')}${t('Otvori zadatak','Open task')}</button>`:''}${!d.sample?`<button type="button" class="fs-primary" data-doc-download="${esc(id)}">${icon('download')}${t('Preuzmi','Download')}</button><button type="button" class="fs-text-button" data-doc-delete="${esc(id)}">${t("Ukloni","Remove")}</button>`:`<button type="button" class="fs-primary" data-doc-action="close">${t("Jasno, krenimo","Got it, let's go")}</button>`}</div><p class="fs-small-print" data-doc-feedback role="status"></p>`;dialog.addEventListener('close',()=>{if(dialog.isConnected&&getState().view==='documents')render();},{once:true,signal});dialog.showModal();if(d.sample)return;try{const blob=await proofStore.get(id);if(!dialog.open||!dialog.isConnected)return;const preview=dialog.querySelector('[data-doc-preview]');if(!blob){preview.textContent=t("Datoteka nije dostupna na ovom uređaju.","This file is not available on this device.");return;}const url=URL.createObjectURL(blob);urls.push(url);if(isImage(d)){const img=document.createElement('img');img.src=url;img.alt=d.name;preview.replaceChildren(img);}else{preview.innerHTML=`<div class="fs-doc-sample-sheet">${icon('file-text')}<h3>${t("Tvoj PDF je spreman.","Your PDF is ready.")}</h3><p>${esc(documentName(d))}</p><span>${t("OTVORI GA PREUZIMANJEM DATOTEKE","DOWNLOAD THE FILE TO OPEN IT")}</span></div>`;}}catch{dialog.querySelector('[data-doc-preview]').textContent=t("Pregled nije dostupan. Pokušaj ponovno.","Preview unavailable. Please try again.");}}
  root.addEventListener('input',e=>{if(e.target.hasAttribute('data-doc-search')){query=e.target.value;refreshGrid();}if(e.target.hasAttribute('data-doc-expiry'))e.target.setCustomValidity('');},{signal});
  root.addEventListener('change',e=>{
    const el=e.target;
    if(el.hasAttribute('data-doc-files'))addFiles(el.files||[]);
    if(el.hasAttribute('data-doc-sort')){sort=el.value;refreshGrid();}
    if(el.hasAttribute('data-doc-category-filter')){categoryFilter=el.value;refreshGrid();}
    if(el.dataset.docCategory){
      const d=storedDocument(el.dataset.docCategory);
      if(d&&(!el.value||getState().categories?.some(c=>c.id===el.value))){d.categoryId=el.value;persist();feedback(t("Kategorija je spremljena.","Category saved."));}
    }
    if(el.dataset.docExpiry){
      const d=storedDocument(el.dataset.docExpiry);if(!d)return;
      el.setCustomValidity('');
      if(el.validity.badInput||(el.value&&!calendarDate(el.value))){el.setCustomValidity(t("Odaberi valjan datum.","Choose a valid date."));el.reportValidity();return;}
      d.expiresOn=el.value||null;persist();
      const info=documentExpiry(d.expiresOn),help=root.querySelector('#fs-doc-expiry-help');
      if(help)help.textContent=info?info.description:t("Dokument nema upisan rok valjanosti.","No expiry date has been added.");
      feedback(d.expiresOn?t("Rok valjanosti je spremljen.","Expiry date saved."):t("Rok valjanosti je uklonjen.","Expiry date removed."));
    }
    if(el.dataset.docLink){const d=getState().documents?.find(d=>d.id===el.dataset.docLink);if(d){d.taskId=el.value||null;persist();feedback(t("Povezivanje je spremljeno.","Link saved."));}}
  },{signal});
  root.addEventListener('dragover',e=>{const drop=e.target.closest('[data-doc-drop]');if(drop){e.preventDefault();drop.classList.add('is-dragging');}},{signal});
  root.addEventListener('dragleave',e=>{const drop=e.target.closest('[data-doc-drop]');if(drop&&!drop.contains(e.relatedTarget))drop.classList.remove('is-dragging');},{signal});
  root.addEventListener('drop',e=>{if(e.target.closest('[data-doc-drop]')){e.preventDefault();addFiles(e.dataTransfer.files);}},{signal});
  root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const dialog=root.querySelector('.fs-doc-dialog');if(b.dataset.docFilter){filter=b.dataset.docFilter;render();}if(b.dataset.docOpen)open(b.dataset.docOpen);if(b.dataset.docPin){const state=getState(),d=entries().find(d=>d.id===b.dataset.docPin);if(d){if(d.fromProof){const task=state.tasks.find(task=>task.id===d.taskId);task.proof.pinned=!d.pinned;}else d.pinned=!d.pinned;persist();render();}}if(b.dataset.docAction==='pick')root.querySelector('[data-doc-files]')?.click();if(b.dataset.docAction==='clear'){filter='all';categoryFilter='';query='';render();}if(b.dataset.docAction==='close'){dialog?.close();render();}if(b.dataset.docTask){dialog?.close();const taskButton=document.createElement('button');taskButton.type='button';taskButton.dataset.task=b.dataset.docTask;taskButton.hidden=true;root.append(taskButton);taskButton.click();taskButton.remove();}if(b.dataset.docDownload){try{const d=entries().find(d=>d.id===b.dataset.docDownload),blob=await proofStore.get(d.id);if(!blob)throw new Error();const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=isImage(d)?d.name.replace(/\.[^.]+$/,'')+'.jpg':d.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{root.querySelector('[data-doc-feedback]').textContent=t("Preuzimanje nije dostupno. Datoteka nije pronađena.","Download unavailable. The file was not found.");}}if(b.dataset.docDelete){if(b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.textContent=t("Potvrdi uklanjanje","Confirm removal");return;}try{const state=getState(),id=b.dataset.docDelete;await proofStore.delete(id);state.documents=(state.documents||[]).filter(d=>d.id!==id);state.tasks.forEach(task=>{if(task.proof?.id===id)task.proof=null;});dialog.close();persist();render();notify(t("Datoteka je uklonjena s ovog uređaja.","File removed from this device."));}catch{root.querySelector('[data-doc-feedback]').textContent=t("Uklanjanje nije uspjelo. Pokušaj ponovno.","Removal failed. Please try again.");}}},{signal});
  signal.addEventListener('abort',()=>{epoch++;bubbleObserver?.disconnect();urls.forEach(URL.revokeObjectURL);},{once:true});
  return {view,hydrate};
}
