"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import enUS from '../locales/en-US/common.json';
import ptBR from '../locales/pt-BR/common.json';

type Locale = 'en-US' | 'pt-BR';

const dictionaries: Record<Locale, any> = {
  'en-US': enUS,
  'pt-BR': ptBR,
};

interface I18nContextProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextProps>({
  locale: 'en-US',
  setLocale: () => {},
  t: () => '',
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('pt-BR');

  useEffect(() => {
    const saved = localStorage.getItem('neer_locale') as Locale;
    if (saved && dictionaries[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('neer_locale', newLocale);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value = dictionaries[locale];
    for (const k of keys) {
      if (value[k] === undefined) return key; // fallback to key
      value = value[k];
    }
    return value as string;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
