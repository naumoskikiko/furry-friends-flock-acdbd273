import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon } from "lucide-react";

const themes = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

const fontSizes = [
  { id: "small", label: "Small", preview: "text-xs" },
  { id: "normal", label: "Medium", preview: "text-sm" },
  { id: "large", label: "Large", preview: "text-base" },
];

const SettingsAppearance = () => {
  const { user, fontSize: currentFontSize, setAppFontSize } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState("light");

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

  const updateTheme = async (t: string) => {
    if (!user) return;
    setTheme(t);
    applyTheme(t);
    await supabase.from("user_settings").update({ theme: t }).eq("user_id", user.id);
    toast({ title: `Theme set to ${t}` });
  };

  const updateFontSize = async (fs: string) => {
    if (!user) return;
    setAppFontSize(fs);
    await supabase.from("user_settings").update({ font_size: fs }).eq("user_id", user.id);
    toast({ title: `Font size set to ${fs === "normal" ? "medium" : fs}` });
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Theme */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <p className="text-sm font-bold mb-3">Theme</p>
        <div className="grid grid-cols-2 gap-2">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => updateTheme(t.id)}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-all ${
                theme === t.id
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <t.icon className={`h-5 w-5 ${theme === t.id ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-xs font-semibold ${theme === t.id ? "text-primary" : ""}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <p className="text-sm font-bold mb-3">Font Size</p>
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
        <p className="text-xs text-muted-foreground mt-2">Changes apply across the entire app</p>
      </div>

      {/* Language */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow">
        <p className="text-sm font-bold mb-2">Language</p>
        <div className="rounded-xl bg-secondary px-3 py-2.5 text-sm">
          🇬🇧 English (Default)
        </div>
        <p className="text-xs text-muted-foreground mt-1">More languages coming soon</p>
      </div>
    </div>
  );
};

export default SettingsAppearance;
