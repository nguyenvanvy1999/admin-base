import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en/translation.json';
import viTranslations from './locales/vi/translation.json';

export const defaultNS = 'translation' as const;

export const resources = {
  en: {
    translation: enTranslations,
  },
  vi: {
    translation: viTranslations,
  },
} as const;

const isProduction = import.meta.env.PROD;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: !isProduction,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    resources,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
