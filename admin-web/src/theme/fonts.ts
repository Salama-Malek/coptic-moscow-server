export const fonts = {
  ar: {
    heading: "'Amiri', serif",
    body: "'Noto Naskh Arabic', serif",
  },
  ru: {
    heading: "'PT Serif', serif",
    body: "'PT Sans', sans-serif",
  },
  en: {
    heading: "'Cormorant Garamond', serif",
    body: "'Inter', sans-serif",
  },
};

export function getFonts(lang: string) {
  if (lang === 'ru') return fonts.ru;
  if (lang === 'en') return fonts.en;
  return fonts.ar;
}
