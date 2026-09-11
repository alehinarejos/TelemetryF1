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

const STORAGE_KEY = 'undercut_selected_language';

const SEO_METADATA: Record<Language, {
  title: string;
  description: string;
  keywords: string;
  locale: string;
}> = {
  es: {
    title: 'UNDERCUT | F1 Live Timing, Telemetría y Estrategia en Directo',
    description: 'UNDERCUT - Plataforma de telemetría, live timing y tiempos de Fórmula 1 en directo. Sigue en tiempo real las vueltas, telemetría de monoplazas, clasificaciones del Mundial 2026 y calendario oficial de F1.',
    keywords: 'F1, Formula 1, Live Timing F1, telemetria F1, F1 tiempos en directo, clasificacion F1 2026, calendario F1 2026, F1 telemetry, F1 live broadcast, F1 timing live, UNDERCUT F1',
    locale: 'es_ES',
  },
  en: {
    title: 'UNDERCUT | Live F1 Telemetry, Real-Time Timing & Race Strategy',
    description: 'UNDERCUT - Formula 1 live timing, car telemetry and race strategy dashboard. Follow real-time lap times, circuit map, 2026 F1 Championship standings, and official schedule.',
    keywords: 'F1 live timing, F1 telemetry, Formula 1 live, F1 standings 2026, F1 schedule 2026, real-time F1 timing, car telemetry F1, F1 pit stop strategy, UNDERCUT F1',
    locale: 'en_US',
  },
  fr: {
    title: 'UNDERCUT | Télémétrie F1 en Direct, Live Timing & Stratégie Formule 1',
    description: 'UNDERCUT - Tableau de bord de télémétrie et live timing Formule 1 en direct. Suivez les temps au tour, la télémétrie des monoplaces, le classement du Championnat 2026 et le calendrier F1 officiel.',
    keywords: 'F1 en direct, live timing F1, télémétrie F1, temps F1 en direct, classement F1 2026, calendrier F1 2026, Formule 1 direct, stratégie F1, UNDERCUT F1',
    locale: 'fr_FR',
  },
  it: {
    title: 'UNDERCUT | Telemetria F1 in Diretta, Live Timing e Strategia Formula 1',
    description: 'UNDERCUT - Piattaforma di telemetria e live timing di Formula 1 in diretta. Segui in tempo reale i tempi sul giro, telemetria monoposto, classifiche del Mondiale 2026 e calendario F1.',
    keywords: 'F1 in diretta, live timing F1, telemetria F1, tempi F1 diretta, classifica F1 2026, calendario F1 2026, Formula 1 streaming dati, strategia pit stop F1, UNDERCUT F1',
    locale: 'it_IT',
  },
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
    const meta = SEO_METADATA[language] || SEO_METADATA.es;
    
    // HTML Language attribute
    document.documentElement.lang = language;

    // Document Title
    document.title = meta.title;

    // Meta Title
    const metaTitle = document.querySelector('meta[name="title"]');
    if (metaTitle) metaTitle.setAttribute('content', meta.title);

    // Meta Description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', meta.description);

    // Meta Keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) metaKeywords.setAttribute('content', meta.keywords);

    // OpenGraph Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);

    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', meta.locale);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://undercut-f1-live.vercel.app/?lang=${language}`);

    // Twitter Card Tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', meta.title);

    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', meta.description);
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
