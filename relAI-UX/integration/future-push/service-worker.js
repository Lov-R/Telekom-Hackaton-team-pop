// No task/photo caching: private user data belongs in Supabase or IndexedDB.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  event.waitUntil(self.registration.showNotification(data.title||'Future Self',{
    body:data.body||'Tvoj sljedeći korak te čeka.',
    icon:'/icons/app-192.png',badge:'/icons/app-192.png',
    tag:data.tag||'future-self',data:data.data||{},
    actions:[{action:'open',title:'Otvori zadatak'}]
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const candidate=new URL(event.notification.data?.url||'/',self.location.origin);
  const url=candidate.origin===self.location.origin?candidate.href:self.location.origin;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(existing){await existing.navigate(url);return existing.focus();}
    return self.clients.openWindow(url);
  })());
});
