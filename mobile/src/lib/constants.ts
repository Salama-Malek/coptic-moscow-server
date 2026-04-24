// For local dev: use your machine's LAN IP so the phone can reach the server
const DEV_API = 'http://192.168.44.107:3000/api';
const PROD_API = 'https://coptic-notify.sm4tech.com/api';

export const API_BASE_URL = __DEV__ ? DEV_API : PROD_API;

export const PARISH_NAME = {
  ar: 'الكنيسة القبطية بموسكو',
  ru: 'Коптская Церковь в Москве',
  en: 'Coptic Church Moscow',
};

export const APP_BUNDLE_ID = 'church.copticmoscow.app';
