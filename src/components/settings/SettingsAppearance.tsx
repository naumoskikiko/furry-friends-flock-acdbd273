import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, LANGUAGE_OPTIONS, Language } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon, Globe } from "lucide-react";

const SettingsAppearance = () => {
  const { user, fontSize: currentFontSize, setAppFontSize } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [theme, setTheme] = useState("light");

  const themes = [
    { id: "light", label: t("appearance.light"), icon: Sun },
    { id: "dark", label: t("appearance.dark"), icon: Moon },
  ];

  const fontSizes = [
    { id: "small", label: t("appearance.fontSmall"), preview: "text-xs" },
    { id: "normal", label: t("appearance.fontMedium"), preview: "text-sm" },
    { id: "large", label: t("appearance.fontLarge"), preview: "text-base" },
  ];

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("theme").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) setTheme(data.theme);
      });
  }, [user]);

  const applyTheme = (t: string) => {
    document.documentElement.classList.remove("light", "dark");
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const updateTheme = async (themeId: string) => {
    if (!user) return;
    setTheme(themeId);
    applyTheme(themeId);
    await supabase.from("user_settings").update({ theme: themeId }).eq("user_id", user.id);
    toast({ title: `${t("appearance.themeSet")} ${themeId}` });
  };

  const updateFontSize = async (fs: string) => {
    if (!user) return;
    setAppFontSize(fs);
    await supabase.from("user_settings").update({ font_size: fs }).eq("user_id", user.id);
    toast({ title: `${t("appearance.fontSizeSet")} ${fs === "normal" ? t("appearance.fontMedium").toLowerCase() : fs}` });
  };

  const updateLanguage = async (lang: Language) => {
    if (!user) return;
    setLanguage(lang);
    await supabase.from("user_settings").update({ language: lang }).eq("user_id", user.id);
    const langLabel = LANGUAGE_OPTIONS.find(l => l.id === lang)?.label || lang;
    toast({ title: `${t("appearance.languageSet")} ${langLabel}` });
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Theme */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <p className="text-sm font-bold mb-3">{t("appearance.theme")}</p>
        <div className="grid grid-cols-2 gap-2">
          {themes.map(th => (
            <button
              key={th.id}
              onClick={() => updateTheme(th.id)}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-all ${
                theme === th.id
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <th.icon className={`h-5 w-5 ${theme === th.id ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-xs font-semibold ${theme === th.id ? "text-primary" : ""}`}>{th.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <p className="text-sm font-bold mb-3">{t("appearance.fontSize")}</p>
        <div className="grid grid-cols-3 gap-2">
          {fontSizes.map(fs => (
            <button
              key={fs.id}
              onClick={() => updateFontSize(fs.id)}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-all ${
                currentFontSize === fs.id
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <span className={`font-semibold ${fs.preview} ${currentFontSize === fs.id ? "text-primary" : ""}`}>Aa</span>
              <span className={`text-xs ${currentFontSize === fs.id ? "text-primary font-semibold" : "text-muted-foreground"}`}>{fs.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{t("appearance.fontSizeNote")}</p>
      </div>

      {/* Language */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <p className="text-sm font-bold mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t("appearance.language")}
        </p>
        <div className="space-y-2">
          {LANGUAGE_OPTIONS.map(lang => (
            <button
              key={lang.id}
              onClick={() => updateLanguage(lang.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                language === lang.id
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className={`font-semibold ${language === lang.id ? "text-primary" : ""}`}>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsAppearance;
