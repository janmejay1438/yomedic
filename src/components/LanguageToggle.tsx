"use client";

import React, { useEffect, useState } from "react";
import { ToggleButton } from "@once-ui-system/core";
import { useI18n } from "./I18nProvider";

export const LanguageToggle: React.FC = () => {
  const { locale, setLocale } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ToggleButton
      onClick={() => setLocale(locale === "en" ? "hi" : "en")}
      label={locale === "en" ? "हि" : "EN"}
      aria-label="Switch Language"
    />
  );
};
