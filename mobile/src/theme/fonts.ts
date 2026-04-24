export const fontFamilies = {
  ar: {
    heading: 'Amiri_700Bold',
    body: 'NotoNaskhArabic_400Regular',
    bodyBold: 'NotoNaskhArabic_600SemiBold',
  },
  ru: {
    heading: 'PTSerif_700Bold',
    body: 'PTSans_400Regular',
    bodyBold: 'PTSans_700Bold',
  },
  en: {
    heading: 'CormorantGaramond_700Bold',
    body: 'Inter_400Regular',
    bodyBold: 'Inter_600SemiBold',
  },
};

export type Language = 'ar' | 'ru' | 'en';

export function getFontFamily(lang: Language) {
  return fontFamilies[lang] || fontFamilies.ar;
}
