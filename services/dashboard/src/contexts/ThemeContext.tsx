"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'high-contrast-light';

interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'dark',
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('neer_theme') as Theme;
    if (saved && (saved === 'dark' || saved === 'light' || saved === 'high-contrast-light')) {
      setThemeState(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    document.documentElement.classList.remove('light-mode', 'high-contrast-light');
    if (newTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else if (newTheme === 'high-contrast-light') {
      document.documentElement.classList.add('high-contrast-light');
    }
  };

  const toggleTheme = () => {
    const nextThemeMap: Record<Theme, Theme> = {
      'dark': 'light',
      'light': 'high-contrast-light',
      'high-contrast-light': 'dark'
    };
    const newTheme = nextThemeMap[theme];
    setThemeState(newTheme);
    localStorage.setItem('neer_theme', newTheme);
    applyTheme(newTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


export const useTheme = () => useContext(ThemeContext);
