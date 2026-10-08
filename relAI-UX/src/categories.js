import {t} from './i18n.js';
export const DEFAULT_CATEGORIES=Object.freeze([
 {id:'utilities',name:'Režije',parentId:null},
 {id:'water',name:'Voda',parentId:'utilities'},
 {id:'gas',name:'Plin',parentId:'utilities'},
 {id:'electricity',name:'Struja',parentId:'utilities'},
 {id:'guarantees',name:'Garancije i računi',parentId:null},
 {id:'warranties',name:'Garancije',parentId:'guarantees'},
 {id:'receipts',name:'Računi',parentId:'guarantees'},
 {id:'health',name:'Pregledi',parentId:null},
 {id:'checkups',name:'Liječnički pregledi',parentId:'health'},
 {id:'lab',name:'Nalazi',parentId:'health'},
 {id:'dentist',name:'Zubar',parentId:'health'},
 {id:'identity',name:'Osobni dokumenti',parentId:null},
 {id:'id-card',name:'Osobna iskaznica',parentId:'identity'},
 {id:'passport',name:'Putovnica',parentId:'identity'},
 {id:'driving-license',name:'Vozačka dozvola',parentId:'identity'},
 {id:'work',name:'Posao',parentId:null},
 {id:'personal',name:'Privatno',parentId:null},
 {id:'self',name:'Za sebe',parentId:null},
].map(category=>Object.freeze(category)));

const DEFAULT_EN={"utilities": "Utilities", "water": "Water", "gas": "Gas", "electricity": "Electricity", "guarantees": "Warranties & receipts", "warranties": "Warranties", "receipts": "Receipts", "health": "Checkups", "checkups": "Medical checkups", "lab": "Test results", "dentist": "Dentist", "identity": "Personal documents", "id-card": "ID card", "passport": "Passport", "driving-license": "Driving licence", "work": "Work", "personal": "Personal", "self": "Me time"};
function categoryName(category){
 const original=DEFAULT_CATEGORIES.find(item=>item.id===category?.id);
 return original&&category.name===original.name?t(original.name,DEFAULT_EN[original.id]):category?.name||'';
}

const normalized=value=>String(value??'').trim().normalize('NFKC').toLocaleLowerCase('hr');
const LEGACY={posao:'work',privatno:'personal',zdravlje:'health','za sebe':'self'};

export function categoryLabel(categories,id){
 const category=categories.find(item=>item.id===id);if(!category)return t('Nerazvrstano','Uncategorized');
 const parent=category.parentId&&categories.find(item=>item.id===category.parentId);
 return parent?`${categoryName(parent)} › ${categoryName(category)}`:categoryName(category);
}
export function categoryMatches(categories,itemId,filterId){
 if(!filterId)return true;
 return itemId===filterId||categories.find(item=>item.id===itemId)?.parentId===filterId;
}
export function categoryIdForTask(categories,task){
 if(Object.hasOwn(task||{},'categoryId'))return task.categoryId||'';
 const name=normalized(task?.category);return LEGACY[name]||categories.find(item=>normalized(item.name)===name)?.id||'';
}
export function validateCategoryChange(categories,{id=null,name,parentId=null}){
 const clean={name:String(name??'').trim(),parentId:parentId||null};
 function fail(message,field){const error=new Error(message);error.field=field;throw error;}
 if(!clean.name||clean.name.length>40)fail(t("Naziv treba imati 1–40 znakova.","Names must be 1–40 characters."),'name');
 if(id&&!categories.some(item=>item.id===id))fail(t("Ova kategorija više nije dostupna.","This category is no longer available."),'name');
 if(clean.parentId){
  const parent=categories.find(item=>item.id===clean.parentId);
  if(!parent||parent.parentId||clean.parentId===id)fail(t("Odaberi glavnu kategoriju. Dostupne su dvije razine.","Choose a main category. Two levels are available."),'parentId');
  if(id&&categories.some(item=>item.parentId===id))fail(t("Kategorija s potkategorijama mora ostati glavna.","A category with subcategories must stay at the top level."),'parentId');
 }
 if(categories.some(item=>item.id!==id&&(item.parentId||null)===clean.parentId&&(normalized(item.name)===normalized(clean.name)||normalized(categoryName(item))===normalized(clean.name))))fail(t("Taj naziv već postoji u ovoj kategoriji.","That name already exists in this category."),'name');
 return clean;
}

export function createCategoryManager({root,getState,persist,render,esc,icon,signal}){
 let editingId=null,draftParent='',notice='';
 const dialog=document.createElement('dialog');dialog.className='rg-category-dialog';dialog.setAttribute('aria-labelledby','rg-category-title');root.append(dialog);
 function entries(){
  const state=getState();
  if(!Array.isArray(state.categories)||!state.categories.length)state.categories=DEFAULT_CATEGORIES.map(item=>({...item}));
  return state.categories;
 }
 entries();
 const roots=()=>entries().filter(item=>!item.parentId);
 const label=id=>categoryLabel(entries(),id);
 function options(selectedId='',{all=false,noneLabel=t('Nerazvrstano','Uncategorized')}={}){
  const option=(value,name)=>`<option value="${esc(value)}" ${selectedId===value?'selected':''}>${esc(name)}</option>`;
  return option('',all?t('Sve kategorije','All categories'):noneLabel)+roots().map(parent=>option(parent.id,categoryName(parent))+entries().filter(item=>item.parentId===parent.id).map(child=>option(child.id,`${categoryName(parent)} › ${categoryName(child)}`)).join('')).join('');
 }
 function paint(){
  const current=entries().find(item=>item.id===editingId),hasChildren=current&&entries().some(item=>item.parentId===current.id);
  const selectedParent=current?.parentId||draftParent;
  dialog.innerHTML=`<header class="rg-category-header"><div><span>${t("TVOJ RASPORED","YOUR ORGANIZATION")}</span><h2 id="rg-category-title">${t("Sve na svom mjestu.","Everything in its place.")}</h2><p>${t("Iste kategorije za zadatke i dokumente.","Shared categories for tasks and documents.")}</p></div><button type="button" data-category-close aria-label="${t("Zatvori kategorije","Close categories")}">${icon('x')}</button></header><form class="rg-category-form"><div class="rg-category-form-title"><h3>${current?t("Uredi kategoriju","Edit category"):t("Nova kategorija","New category")}</h3>${current?`<button type="button" data-category-new>${t("+ Nova","+ New")}</button>`:''}</div><label class="rg-category-field"><span>${t("Naziv","Name")}</span><input name="name" required maxlength="40" autocomplete="off" value="${esc(current?categoryName(current):'')}" placeholder="${t("Npr. Dom ili Auto","E.g. Home or Car")}"></label><label class="rg-category-field"><span>${t("Pripada kategoriji","Parent category")}</span><select name="parentId" aria-label="${t("Pripada kategoriji","Parent category")}" ${hasChildren?'disabled':''}><option value="">${t("Glavna kategorija","Main category")}</option>${roots().filter(parent=>parent.id!==editingId).map(parent=>`<option value="${esc(parent.id)}" ${selectedParent===parent.id?'selected':''}>${esc(categoryName(parent))}</option>`).join('')}</select>${hasChildren?`<small>${t("Ima potkategorije pa ostaje glavna.","It has subcategories, so it stays at the top level.")}</small>`:''}</label><div class="rg-category-save-row"><span class="rg-category-feedback" role="status">${esc(notice)}</span><button type="submit">${icon(current?'check':'plus')}${current?t("Spremi","Save"):t("Dodaj","Add")}</button></div></form><section class="rg-category-tree" aria-label="${t("Tvoje kategorije","Your categories")}">${roots().map(parent=>{const children=entries().filter(item=>item.parentId===parent.id);return `<div class="rg-category-group"><div class="rg-category-parent-row"><button type="button" class="rg-category-parent ${editingId===parent.id?'is-editing':''}" data-category-edit="${esc(parent.id)}" aria-label="${t('Uredi kategoriju','Edit category')} ${esc(categoryName(parent))}">${icon('folder-open')}<strong>${esc(categoryName(parent))}</strong>${icon('pencil')}</button><button type="button" class="rg-category-add-child" data-category-child="${esc(parent.id)}" aria-label="${t('Dodaj potkategoriju','Add subcategory')}: ${esc(categoryName(parent))}">${icon('plus')}</button></div>${children.length?`<div class="rg-category-children">${children.map(child=>`<button type="button" class="${editingId===child.id?'is-editing':''}" data-category-edit="${esc(child.id)}" aria-label="${t('Uredi potkategoriju','Edit subcategory')} ${esc(categoryName(parent))}: ${esc(categoryName(child))}">${esc(categoryName(child))}${icon('pencil')}</button>`).join('')}</div>`:''}</div>`;}).join('')}</section>`;
 }
 function focusForm(){dialog.scrollTop=0;dialog.querySelector('[name=name]')?.focus({preventScroll:true});}
 function open(){
  if(signal.aborted)return;
  editingId=null;draftParent='';notice='';paint();if(!dialog.open)dialog.showModal();
  const title=dialog.querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});dialog.scrollTop=0;
 }
 dialog.addEventListener('submit',event=>{
  event.preventDefault();event.stopPropagation();const form=event.target;if(!form.matches('.rg-category-form'))return;
  const current=entries().find(item=>item.id===editingId);
  let clean;
  try{clean=validateCategoryChange(entries(),{id:editingId,name:current&&form.elements.name.value.trim()===categoryName(current)?current.name:form.elements.name.value,parentId:form.elements.parentId.value});}
  catch(error){const input=form.elements[error.field||'name'];input.setCustomValidity(error.message);form.reportValidity();return;}
  if(current)Object.assign(current,clean);else entries().push({id:crypto.randomUUID(),...clean});
  notice=current?t("Promjene su spremljene.","Changes saved."):t("Kategorija je dodana.","Category added.");editingId=null;draftParent='';
  persist();render();paint();
  root.dispatchEvent(new CustomEvent('relai:categories-changed',{bubbles:true}));
  dialog.querySelector('.rg-category-feedback')?.setAttribute('tabindex','-1');
  dialog.querySelector('.rg-category-feedback')?.focus({preventScroll:true});
 },{signal});
 dialog.addEventListener('input',event=>{if('setCustomValidity' in event.target)event.target.setCustomValidity('');},{signal});
 dialog.addEventListener('change',event=>{
  if('setCustomValidity' in event.target)event.target.setCustomValidity('');
  // Moving a same-named item into another parent resolves a duplicate error.
  if(event.target.name==='parentId')dialog.querySelector('[name=name]')?.setCustomValidity('');
 },{signal});
 dialog.addEventListener('keydown',event=>event.stopPropagation(),{signal});
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-category-close'))dialog.close();
  else if(button.hasAttribute('data-category-new')){editingId=null;draftParent='';notice='';paint();focusForm();}
  else if(button.dataset.categoryEdit){editingId=button.dataset.categoryEdit;draftParent='';notice='';paint();focusForm();}
  else if(button.dataset.categoryChild){editingId=null;draftParent=button.dataset.categoryChild;notice='';paint();focusForm();}
 },{signal});
 root.addEventListener('click',event=>{if(event.target.closest('[data-category-manage]'))open();},{signal});
 signal.addEventListener('abort',()=>dialog.remove(),{once:true});
 function settingsSection(){return `<section class="rg-category-settings"><div><span>${t("TVOJ RASPORED","YOUR ORGANIZATION")}</span><h2>${t("Kategorije","Categories")}</h2><p>${t("Za zadatke i dokumente, po tvom.","Your tasks and documents, your way.")}</p></div><button type="button" data-category-manage>${icon('folder-open')}<span>${t("Uredi kategorije","Edit categories")}<small>${t('{count} glavnih kategorija','{count} main categories',{count:roots().length})}</small></span>${icon('chevron-right')}</button></section>`;}
  return {options,label,idForTask:task=>categoryIdForTask(entries(),task),matches:(itemId,filterId)=>categoryMatches(entries(),itemId,filterId),settingsSection,open};
}
