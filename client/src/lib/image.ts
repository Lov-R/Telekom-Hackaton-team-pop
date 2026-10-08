/**
 * SRS §5.2: photos are shrunk to at most 2048 px on the longer side and re-encoded as JPEG in the browser
 * (this also turns iPhone HEIC into JPEG). PDFs are uploaded as they are.
 */
export async function downscaleImage(file: File, maxSide = 2048, quality = 0.85): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Format the browser cannot decode: let the server decide.
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;
  const name = `${file.name.replace(/\.[^.]+$/, '') || 'dokument'}.jpg`;
  return new File([blob], name, { type: 'image/jpeg' });
}
