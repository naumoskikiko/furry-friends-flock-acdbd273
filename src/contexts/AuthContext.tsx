import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const FONT_SIZE_SCALE: Record<string, string> = {
  small: "14px",
  normal: "16px",
  large: "18px",
};

const applyFontSize = (fs: string) => {
  const size = FONT_SIZE_SCALE[fs] || FONT_SIZE_SCALE.normal;
  document.documentElement.style.fontSize = size;
  document.documentElement.dataset.fontSize = fs;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  fontSize: string;
  setAppFontSize: (fs: string) => void;
  loadedLanguage: string | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  fontSize: "normal",
  setAppFontSize: () => {},
  loadedLanguage: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<string>(() => {
    const cached = localStorage.getItem("petkeep_font_size");
    if (cached && FONT_SIZE_SCALE[cached]) {
      applyFontSize(cached);
      return cached;
    }
    return "normal";
  });
  const [loadedLanguage, setLoadedLanguage] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const loadUserSettings = async (userId: string) => {
    const { data } = await supabase
      .from("user_settings")
      .select("font_size, language")
      .eq("user_id", userId)
      .single();
    if (data?.font_size) {
      setFontSize(data.font_size);
      applyFontSize(data.font_size);
      localStorage.setItem("petkeep_font_size", data.font_size);
    }
    if (data?.language) {
      setLoadedLanguage(data.language);
      localStorage.setItem("petkeep_language", data.language);
    }
  };

  const setAppFontSize = (fs: string) => {
    setFontSize(fs);
    applyFontSize(fs);
    localStorage.setItem("petkeep_font_size", fs);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
          setTimeout(() => loadUserSettings(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        loadUserSettings(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    // Reset font size
    applyFontSize("normal");
    localStorage.removeItem("petkeep_font_size");
    localStorage.removeItem("petkeep_language");
    setLoadedLanguage(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile, fontSize, setAppFontSize, loadedLanguage }}>
      {children}
    </AuthContext.Provider>
  );
};
