import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowLeft, User, Shield, Bell, CreditCard, Lock, Palette, PawPrint, ShieldCheck, HelpCircle, FileText, AlertTriangle, Sparkles, ChevronRight, LogOut } from "lucide-react";

// Each settings section is its own chunk so the Settings landing page stays
// snappy. Without this, the admin-only ProfessionalMode (which pulls every
// platform-management panel) bloats Settings to ~290 KB even for regular
// users who never open it. Code-splitting drops the initial Settings cost
// to whatever the user actually opens.
const SettingsAccount = lazy(() => import("@/components/settings/SettingsAccount"));
const SettingsSecurity = lazy(() => import("@/components/settings/SettingsSecurity"));
const SettingsNotifications = lazy(() => import("@/components/settings/SettingsNotifications"));
const SettingsPayments = lazy(() => import("@/components/settings/SettingsPayments"));
const SettingsPrivacy = lazy(() => import("@/components/settings/SettingsPrivacy"));
const SettingsAppearance = lazy(() => import("@/components/settings/SettingsAppearance"));
const SettingsPet = lazy(() => import("@/components/settings/SettingsPet"));
const SettingsTrust = lazy(() => import("@/components/settings/SettingsTrust"));
const SettingsSupport = lazy(() => import("@/components/settings/SettingsSupport"));
const SettingsLegal = lazy(() => import("@/components/settings/SettingsLegal"));
const SettingsDangerZone = lazy(() => import("@/components/settings/SettingsDangerZone"));
const ProfessionalMode = lazy(() => import("@/components/settings/ProfessionalMode"));

/** Lightweight in-page fallback while a section chunk loads. */
const SectionFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

type SettingsSection = "main" | "account" | "security" | "notifications" | "payments" | "privacy" | "appearance" | "pet" | "trust" | "support" | "legal" | "danger" | "professional";

const sectionDefs = [
  { id: "account" as const, labelKey: "settings.account", descKey: "settings.accountDesc", icon: User },
  { id: "security" as const, labelKey: "settings.security", descKey: "settings.securityDesc", icon: Shield },
  { id: "notifications" as const, labelKey: "settings.notifications", descKey: "settings.notificationsDesc", icon: Bell },
  { id: "payments" as const, labelKey: "settings.payments", descKey: "settings.paymentsDesc", icon: CreditCard },
  { id: "privacy" as const, labelKey: "settings.privacy", descKey: "settings.privacyDesc", icon: Lock },
  { id: "appearance" as const, labelKey: "settings.appearance", descKey: "settings.appearanceDesc", icon: Palette },
  
  
  { id: "support" as const, labelKey: "settings.support", descKey: "settings.supportDesc", icon: HelpCircle },
  { id: "legal" as const, labelKey: "settings.legal", descKey: "settings.legalDesc", icon: FileText },
  { id: "danger" as const, labelKey: "settings.dangerZone", descKey: "settings.dangerZoneDesc", icon: AlertTriangle, danger: true },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");

  const handleBack = () => {
    if (activeSection === "main") {
      navigate("/profile");
    } else {
      setActiveSection("main");
    }
  };

  const getSectionTitle = () => {
    if (activeSection === "main") return t("settings.title");
    if (activeSection === "professional") return t("settings.professionalMode");
    const sec = sectionDefs.find(s => s.id === activeSection);
    return sec ? t(sec.labelKey) : t("settings.title");
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg min-h-screen">
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
          <button onClick={handleBack} className="rounded-full p-1.5 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold">{getSectionTitle()}</h1>
        </div>

        {activeSection === "main" && (
          <div className="px-4 py-2">
            {isAdmin && (
              <button
                onClick={() => setActiveSection("professional")}
                className="w-full mb-3 mt-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4 petkeep-card-shadow"
              >
                <Sparkles className="h-5 w-5 text-primary" />
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">{t("settings.professionalMode")}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.professionalModeDesc")}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {sectionDefs.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 mb-1 transition-colors hover:bg-secondary/60 ${
                  section.danger ? "text-destructive" : ""
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  section.danger ? "bg-destructive/10" : "bg-secondary"
                }`}>
                  <section.icon className={`h-4.5 w-4.5 ${section.danger ? "text-destructive" : "text-foreground"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">{t(section.labelKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(section.descKey)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}

            <div className="mt-6 mb-8 border-t border-border pt-4">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-destructive transition-colors hover:bg-destructive/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                  <LogOut className="h-4.5 w-4.5 text-destructive" />
                </div>
                <p className="text-sm font-semibold">{t("auth.logout")}</p>
              </button>
            </div>
          </div>
        )}

        <Suspense fallback={<SectionFallback />}>
          {activeSection === "account" && <SettingsAccount />}
          {activeSection === "security" && <SettingsSecurity />}
          {activeSection === "notifications" && <SettingsNotifications />}
          {activeSection === "payments" && <SettingsPayments />}
          {activeSection === "privacy" && <SettingsPrivacy />}
          {activeSection === "appearance" && <SettingsAppearance />}
          {activeSection === "pet" && <SettingsPet />}
          {activeSection === "trust" && <SettingsTrust />}
          {activeSection === "support" && <SettingsSupport />}
          {activeSection === "legal" && <SettingsLegal />}
          {activeSection === "danger" && <SettingsDangerZone />}
          {activeSection === "professional" && <ProfessionalMode />}
        </Suspense>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
