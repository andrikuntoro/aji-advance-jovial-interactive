"use client";

/**
 * Language Context — provides `t()` translation function and `lang` / `setLang` controls.
 * Persists language preference to localStorage.
 *
 * Hydration note: The server always renders with the default "en" lang.
 * The stored locale is read from localStorage after mount and applied only on
 * the client, preventing SSR/client text mismatches (React hydration errors).
 * Locale-sensitive text nodes use `suppressHydrationWarning` so React skips
 * the diff for those specific nodes during rehydration.
 */

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Lang, TranslationKey, translations } from "@/lib/i18n";

interface I18nContextValue {
  lang: Lang;
  /** True after the component has mounted on the client and localStorage has been read. */
  mounted: boolean;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  mounted: false,
  setLang: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "aji-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount (client-only).
  // We intentionally keep the initial state as "en" so the server and the
  // first client render are identical, then swap to the stored locale.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "id") {
      setLangState(stored);
    }
    setMounted(true);
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string>): string => {
      const dict = translations[lang] as Record<string, string>;
      let text = dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, v);
        });
      }
      return text;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, mounted, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
