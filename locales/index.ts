import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import ko from './ko.json';
import en from './en.json';
import ja from './ja.json';

const resources = {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
};

// Get device language
const deviceLanguage = getLocales()[0]?.languageCode?.split('-')[0] ?? 'en';

console.log('Device Language:', deviceLanguage);

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: deviceLanguage, // Initial language
        fallbackLng: 'en',   // Fallback language
        interpolation: {
            escapeValue: false, // React handles escaping
        },
        compatibilityJSON: 'v3', // For Android compatibility
        debug: true, // Enable debug logs
    });

export default i18n;
