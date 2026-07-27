import { createContext, useContext, useEffect, useState } from "react";
import { translations, getDefaultLanguage } from "../i18n/translations";
import { useAuth } from "../hooks/useAuth";

interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: getDefaultLanguage(),
  setLanguage: () => {},
  t: (key) => key,
});

function resolveNested(obj: any, path: string): string {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return path;
    current = current[part];
  }
  if (typeof current === "string") return current;
  return path;
}

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? _);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [language, setLanguageState] = useState<string>(() => getDefaultLanguage());

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
  };

  const t = (key: string, params?: Record<string, string>) => {
    const dict = translations[language] || translations.en;
    const template = resolveNested(dict, key);
    return interpolate(template, params);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:4000/api/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        if (data.language) setLanguageState(data.language);
      })
      .catch(() => {});
  }, [token]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
