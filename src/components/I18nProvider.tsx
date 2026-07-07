"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../messages/en.json";
import hiMessages from "../../messages/hi.json";

const messagesMap = {
  en: enMessages,
  hi: hiMessages,
};

type LocaleType = "en" | "hi";

interface I18nContextProps {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
}

const I18nContext = createContext<I18nContextProps>({
  locale: "en",
  setLocale: () => {},
});

export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>("en");

  useEffect(() => {
    const getInitialLocale = (): LocaleType => {
      const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
      if (match && (match[1] === "en" || match[1] === "hi")) {
        return match[1] as LocaleType;
      }
      const saved = localStorage.getItem("locale");
      if (saved === "en" || saved === "hi") {
        return saved as LocaleType;
      }
      return "en";
    };
    setLocaleState(getInitialLocale());
  }, []);

  const setLocale = (newLocale: LocaleType) => {
    localStorage.setItem("locale", newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    setLocaleState(newLocale);
    window.location.reload();
  };

  const messages = messagesMap[locale];

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}
