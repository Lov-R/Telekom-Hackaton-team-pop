function publicKeyBytes(key) {
  const value=(key+'='.repeat((4-key.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(value),c=>c.charCodeAt(0));
}
export async function enablePush(backend) {
  if (backend.mode !== 'supabase') throw new Error('Za stvarne push obavijesti prvo poveži Supabase i prijavi se.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Na iPhoneu dodaj aplikaciju na početni zaslon pa je otvori odatle (iOS 16.4+).');
  const key=import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!key) throw new Error('Nedostaje javni VAPID ključ za push obavijesti.');
  // Called only from the explicit Enable push click.
  const permission=await Notification.requestPermission();
  if(permission!=='granted') throw new Error('Push nije dopušten. Ostale funkcije rade i bez obavijesti.');
  const registration=await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let subscription=await registration.pushManager.getSubscription();
  const created=!subscription;
  if(!subscription) subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKeyBytes(key)});
  try { await backend.saveSubscription(subscription.toJSON()); }
  catch(error){ if(created) await subscription.unsubscribe(); throw error; }
  return true;
}
export async function disablePush(backend) {
  if(!('serviceWorker' in navigator)) return;
  const registration=await navigator.serviceWorker.getRegistration('/');
  const subscription=await registration?.pushManager.getSubscription();
  if(subscription){await backend.removeSubscription(subscription.endpoint);await subscription.unsubscribe();}
}
