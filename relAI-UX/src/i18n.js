// UI language only: user-authored tasks, names, files and categories remain intact.
let language='hr';
export const getLanguage=()=>language;
export const locale=()=>language==='en'?'en-GB':'hr-HR';
export function setLanguage(value){language=value==='en'?'en':'hr';return language;}
export function t(hr,en,params={}){
 const copy=language==='en'?(en??hr):hr;
 return String(copy).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g,(match,key)=>Object.hasOwn(params,key)?String(params[key]):match);
}
const SAMPLE_TASKS={
 meeting:['Sastanak s timom','Team meeting'],
 car:['Registracija auta','Car registration'],
 doctor:['Liječnički pregled','Medical appointment'],
 walk:['Jutarnja šetnja','Morning walk'],
 dentist:['Dogovoriti termin kod zubara','Book a dentist appointment'],
};
export function taskTitle(task){
 const seed=SAMPLE_TASKS[task?.id];
 if(seed&&task.title===seed[0])return t(...seed);
 if(task?.sourceId==='apple-demo-project'&&task.title==='Sastanak o projektu')return t('Sastanak o projektu','Project meeting');
 return task?.title||'';
}
