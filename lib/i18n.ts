import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import hi from './locales/hi.json';

const LANGUAGE_KEY = '@voltfly_language';

export type SupportedLanguage = 'en' | 'hi';

/**
 * Loads the saved language from AsyncStorage.
 * Falls back to device locale (Hindi if device is set to Hindi), then English.
 */
const getInitialLanguage = async (): Promise<SupportedLanguage> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved === 'en' || saved === 'hi') return saved;

    // Check device locale
    const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
    return locale === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
};

/**
 * Saves the selected language to AsyncStorage so it persists across app restarts.
 */
export const setLanguage = async (lang: SupportedLanguage): Promise<void> => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

/**
 * Returns the currently active language.
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) ?? 'en';
};

/**
 * Initialize i18n. Call this once at app startup.
 * This is async — we first read AsyncStorage for the saved preference.
 */
export const initI18n = async (): Promise<void> => {
  const initialLang = await getInitialLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
      },
      lng: initialLang,
      fallbackLng: 'en',
      interpolation: {
        // React already handles XSS
        escapeValue: false,
      },
      compatibilityJSON: 'v4',
    });
};

export default i18n;
