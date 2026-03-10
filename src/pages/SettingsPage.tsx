import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ArrowLeft, User, Shield, Bell, CreditCard, Lock, Palette, PawPrint, ShieldCheck, HelpCircle, FileText, AlertTriangle, Sparkles, ChevronRight, LogOut } from "lucide-react";
import SettingsAccount from "@/components/settings/SettingsAccount";
import SettingsSecurity from "@/components/settings/SettingsSecurity";
import SettingsNotifications from "@/components/settings/SettingsNotifications";
import SettingsPayments from "@/components/settings/SettingsPayments";
import SettingsPrivacy from "@/components/settings/SettingsPrivacy";
import SettingsAppearance from "@/components/settings/SettingsAppearance";
import SettingsPet from "@/components/settings/SettingsPet";
import SettingsTrust from "@/components/settings/SettingsTrust";
import SettingsSupport from "@/components/settings/SettingsSupport";
import SettingsLegal from "@/components/settings/SettingsLegal";
import SettingsDangerZone from "@/components/settings/SettingsDangerZone";
import ProfessionalMode from "@/components/settings/ProfessionalMode";

type SettingsSection = "main" | "account" | "security" | "notifications" | "payments" | "privacy" | "appearance" | "pet" | "trust" | "support" | "legal" | "danger" | "professional";

const sections = [
  { id: "account" as const, label: "Account", icon: User, description: "Edit profile, password, email" },
  { id: "security" as const, label: "Security", icon: Shield, description: "2FA, login activity, connected accounts" },
  { id: "notifications" as const, label: "Notifications", icon: Bell, description: "Push, email & SMS alerts" },
  { id: "payments" as const, label: "Payments & Payouts", icon: CreditCard, description: "Payment methods, billing history" },
  { id: "privacy" as const, label: "Privacy", icon: Lock, description: "Account visibility, messaging, data" },
  { id: "appearance" as const, label: "Appearance", icon: Palette, description: "Theme, font size, language" },
  { id: "pet" as const, label: "Pet Settings", icon: PawPrint, description: "Emergency contacts, vet info" },
  { id: "trust" as const, label: "Trust & Verification", icon: ShieldCheck, description: "ID, certifications, badges" },
  { id: "support" as const, label: "Support", icon: HelpCircle, description: "Help center, contact, report" },
  { id: "legal" as const, label: "Legal", icon: FileText, description: "Terms, privacy policy, guidelines" },
  { id: "danger" as const, label: "Danger Zone", icon: AlertTriangle, description: "Deactivate or delete account", danger: true },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [activeSection, setActiveSection] = useState<SettingsSection>("main");

  const handleBack = () => {
    if (activeSection === "main") {
      navigate("/profile");
    } else {
      setActiveSection("main");
    }
  };

  const getSectionTitle = () => {
    if (activeSection === "main") return "Settings";
    if (activeSection === "professional") return "Professional Mode";
    return sections.find(s => s.id === activeSection)?.label || "Settings";
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
            {/* Professional Mode Banner - Admin Only */}
            {isAdmin && (
              <button
                onClick={() => setActiveSection("professional")}
                className="w-full mb-3 mt-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4 petkeep-card-shadow"
              >
                <Sparkles className="h-5 w-5 text-primary" />
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">Professional Mode</p>
                  <p className="text-xs text-muted-foreground">Admin tools & platform management</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {sections.map((section) => (
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
                  <p className="text-sm font-semibold">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
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
                <p className="text-sm font-semibold">Log Out</p>
              </button>
            </div>
          </div>
        )}

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
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
