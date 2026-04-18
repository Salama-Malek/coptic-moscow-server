import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import ru from './locales/ru.json';
import en from './locales/en.json';

const savedLang = localStorage.getItem('admin_language') || 'ar';

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

export default i18n;

export function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
  localStorage.setItem('admin_language', lang);
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

// Set initial direction
document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;
