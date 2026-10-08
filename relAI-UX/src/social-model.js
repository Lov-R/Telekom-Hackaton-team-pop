// Shared sample circle; replace this boundary with authorized memberships and scores.
export function circleMembers(state) {
  return [
    {id:'luna',name:'Luna',steps:6,xp:310,hp:70,avatar:{gender:'female',hair:'#d5bd85'}},
    {id:'ivan',name:'Ivan',steps:4,xp:220,hp:55,avatar:{gender:'male',hair:'#201b22'}},
    {id:'mia',name:'Mia',steps:2,xp:100,hp:35,avatar:{gender:'female',hair:'#b87743'}},
    {id:'self',name:state.profile?.username||'you',steps:state.weekPosition||0,xp:state.weekXP||0,hp:state.hp||0,avatar:state.avatar||{},self:true},
  ];
}
export function rankMembers(members) {
  const sorted=[...members].sort((a,b)=>b.steps-a.steps||b.xp-a.xp||a.id.localeCompare(b.id));
  return sorted.map((m,i)=>({...m,rank:1+sorted.filter(n=>n.steps>m.steps||(n.steps===m.steps&&n.xp>m.xp)).length}));
}
export function messageText(value) {
  return typeof value==='string'?value.trim().slice(0,1000):'';
}
