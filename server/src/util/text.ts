/** Lowercase and strip diacritics (č, ć, š, ž, đ → c, c, s, z, d). */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
