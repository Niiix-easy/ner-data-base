"use client";

import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Globe } from 'lucide-react';

export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en-US', label: 'English' },
    { code: 'pt-BR', label: 'Português' },
    { code: 'es-ES', label: 'Español' },
    { code: 'fr-FR', label: 'Français' },
    { code: 'de-DE', label: 'Deutsch' },
    { code: 'it-IT', label: 'Italiano' },
    { code: 'ja-JP', label: '日本語' },
    { code: 'ko-KR', label: '한국어' },
    { code: 'zh-CN', label: '中文' },
  ];

  const currentLang = languages.find(l => l.code === locale) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white bg-[#2c2c2c] px-3 py-1.5 rounded-md border border-[#444] transition-colors"
      >
        <Globe size={16} />
        {currentLang.label}
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#2c2c2c] border border-[#444] rounded-md shadow-xl overflow-hidden z-50">
          <ul className="py-1">
            {languages.map((lang) => (
              <li key={lang.code}>
                <button
                  onClick={() => {
                    setLocale(lang.code as any);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    locale === lang.code
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-[#3c3c3c] hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
