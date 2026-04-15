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
  { id: "small", label: "Small", size: "text-xs" },
  { id: "normal", label: "Normal", size: "text-sm" },
  { id: "large", label: "Large", size: "text-base" },
];

const SettingsAppearance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState("system");
  const [fontSize, setFontSize] = useState("normal");

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("theme, font_size").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setTheme(data.theme);
          setFontSize(data.font_size);
        }
      });
  }, [user]);

  const applyTheme = (t: string) => {
    document.documentElement.classList.remove("light", "dark");
    if (t === "dark") document.documentElement.classList.add("dark");
    else if (t === "light") document.documentElement.classList.remove("dark");
    else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      }
    }
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
    setFontSize(fs);
    await supabase.from("user_settings").update({ font_size: fs }).eq("user_id", user.id);
    toast({ title: `Font size set to ${fs}` });
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
                fontSize === fs.id
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <span className={`font-semibold ${fs.size} ${fontSize === fs.id ? "text-primary" : ""}`}>Aa</span>
              <span className={`text-xs ${fontSize === fs.id ? "text-primary font-semibold" : "text-muted-foreground"}`}>{fs.label}</span>
            </button>
          ))}
        </div>
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
