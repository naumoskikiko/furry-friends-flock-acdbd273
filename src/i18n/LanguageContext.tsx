import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import en from "./en";
import mk from "./mk";

export type Language = "en" | "mk";

const translations: Record<Language, Record<string, string>> = { en, mk };

export const LANGUAGE_OPTIONS = [
  { id: "en" as Language, label: "English", flag: "🇬🇧" },
  { id: "mk" as Language, label: "Македонски", flag: "🇲🇰" },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { loadedLanguage } = useAuth();

  const [language, setLanguageState] = useState<Language>(() => {
    const cached = localStorage.getItem("petkeep_language");
    return (cached === "mk" ? "mk" : "en") as Language;
  });

  // Sync when DB value loads
  useEffect(() => {
    if (loadedLanguage && (loadedLanguage === "en" || loadedLanguage === "mk")) {
      setLanguageState(loadedLanguage as Language);
      document.documentElement.lang = loadedLanguage;
    }
  }, [loadedLanguage]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("petkeep_language", lang);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = translations[language]?.[key] || translations.en[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
