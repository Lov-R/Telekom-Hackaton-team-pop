import {t} from './i18n.js';
import { MAX_PROOF_BYTES, PROOF_TYPES } from './domain.mjs';
const DB = 'future-self-proof-v1';
function db() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(DB,1);
    request.onupgradeneeded = () => request.result.createObjectStore('proofs');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction(mode, work) {
  const database = await db();
  return new Promise((resolve,reject) => {
    const tx = database.transaction('proofs',mode), store = tx.objectStore('proofs');
    const request = work(store);
    tx.oncomplete = () => { const value = request?.result; database.close(); resolve(value); };
    tx.onerror = () => { database.close(); reject(tx.error); };
  });
}
export const proofStore = {
  put: (key,blob) => transaction('readwrite',s=>s.put(blob,key)),
  get: key => transaction('readonly',s=>s.get(key)),
  delete: key => transaction('readwrite',s=>s.delete(key)),
  clear: () => transaction('readwrite',s=>s.clear())
};
export async function preparePhoto(file) {
  if (!file || !PROOF_TYPES.includes(file.type)) throw new Error(t("Odaberi JPEG, PNG ili WebP fotografiju.","Choose a JPEG, PNG or WebP photo."));
  if (file.size > MAX_PROOF_BYTES) throw new Error(t("Fotografija smije imati najviše 8 MB.","Photos can be up to 8 MB."));
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error(t("Datoteka se ne može otvoriti kao fotografija.","This file cannot be opened as a photo.")); }
  if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) {
    bitmap.close(); throw new Error(t("Fotografija je prevelike rezolucije (maksimalno 40 MP).","Photo resolution is too high (maximum 40 MP)."));
  }
  // Re-encoding removes original EXIF metadata and limits uploads to 1600 px.
  const scale = Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width*scale); canvas.height = Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
  const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.86));
  if (!blob) throw new Error(t("Obrada fotografije nije uspjela.","The photo could not be processed."));
  return { blob, mime:'image/jpeg', size:blob.size, width:canvas.width, height:canvas.height };
}
