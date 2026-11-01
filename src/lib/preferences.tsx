import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { translate, type Lang, type StringKey } from "./i18n";

const STORAGE_KEY = "kad:prefs";

interface Preferences {
  lang: Lang;
  largeText: boolean;
}

interface PreferencesValue extends Preferences {
  setLang: (lang: Lang) => void;
  setLargeText: (on: boolean) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const DEFAULTS: Preferences = { lang: "en", largeText: false };

const PreferencesContext = createContext<PreferencesValue | null>(null);

function readStored(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      lang: parsed.lang === "te" ? "te" : "en",
      largeText: parsed.largeText === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Start with defaults so the server and first client render match,
  // then load the farmer's saved choice after hydration.
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);

  useEffect(() => {
    setPrefs(readStored());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = prefs.lang;
    root.classList.toggle("text-large", prefs.largeText);
  }, [prefs]);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<PreferencesValue>(
    () => ({
      ...prefs,
      setLang: (lang) => update({ lang }),
      setLargeText: (largeText) => update({ largeText }),
      t: (key, vars) => translate(prefs.lang, key, vars),
    }),
    [prefs, update],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return context;
}

/** Shorthand for the translate function. */
export function useT() {
  return usePreferences().t;
}
