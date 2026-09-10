import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, SUPPORTED_LANGUAGES } from '../i18n/translations';
import type { Language, TranslationKey, LanguageOption } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentLanguageOption: LanguageOption;
  languages: LanguageOption[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'overcut_selected_language';

const SEO_TITLES: Record<Language, string> = {
  es: 'OVERCUT | F1 Live Timing, Telemetría y Estrategia en Directo',
  en: 'OVERCUT | F1 Live Timing, Telemetry & Strategy',
  fr: 'OVERCUT | F1 Live Timing, Télémétrie et Stratégie en Direct',
  it: 'OVERCUT | F1 Live Timing, Telemetria e Strategia in Diretta',
};

const SEO_DESCRIPTIONS: Record<Language, string> = {
  es: 'OVERCUT - Plataforma de telemetría, live timing y tiempos de Fórmula 1 en directo. Tiempos por vuelta, telemetría de monoplazas, clasificaciones del Mundial 2026 y calendario oficial.',
  en: 'OVERCUT - Formula 1 live timing, telemetry and strategy dashboard. Real-time lap times, car telemetry, 2026 Championship standings, and official F1 schedule.',
  fr: 'OVERCUT - Tableau de bord de télémétrie et temps de Formule 1 en direct. Chronométrage en temps réel, télémétrie des monoplaces, classements du Championnat 2026 et calendrier F1.',
  it: 'OVERCUT - Piattaforma di telemetria e tempi sul giro di Formula 1 in diretta. Live timing in tempo reale, telemetria vetture, classifiche del Mondiale 2026 e calendario F1.',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // 1. Check URL query param ?lang=xx
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang') as Language;
      if (urlLang && ['es', 'en', 'fr', 'it'].includes(urlLang)) {
        return urlLang;
      }
    }

    // 2. Check localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    if (saved && ['es', 'en', 'fr', 'it'].includes(saved)) {
      return saved;
    }

    // 3. Detect browser language
    const browserLang = navigator.language?.slice(0, 2).toLowerCase();
    if (browserLang === 'es') return 'es';
    if (browserLang === 'fr') return 'fr';
    if (browserLang === 'it') return 'it';
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      // Update URL query parameter cleanly without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = SEO_TITLES[language] || SEO_TITLES.es;

    // Update meta description dynamically for SEO
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', SEO_DESCRIPTIONS[language] || SEO_DESCRIPTIONS.es);
    }
  }, [language]);

  const currentLanguageOption = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations.en;
    let text: string = (langDict as any)[key] || (translations.en as any)[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguageOption, languages: SUPPORTED_LANGUAGES, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
