import { useState } from "react";
import { Map, BarChart3, ShieldCheck, Store, ChevronRight, ArrowLeft, Users } from "lucide-react";
import SettingsMapManagement from "./SettingsMapManagement";
import CareVerificationPanel from "./CareVerificationPanel";
import CareManagementPanel from "./CareManagementPanel";

type SubSection = "dashboard" | "map-management" | "care-verification" | "care-management";

const futureSections = [
  { id: "analytics", label: "Platform Analytics", icon: BarChart3, description: "User stats, growth metrics", coming: true },
  { id: "marketplace", label: "Marketplace Control", icon: Store, description: "Manage listings & products", coming: true },
];

const ProfessionalMode = () => {
  const [sub, setSub] = useState<SubSection>("dashboard");

  if (sub === "map-management" || sub === "care-verification" || sub === "care-management") {
    return (
      <div>
        <button
          onClick={() => setSub("dashboard")}
          className="flex items-center gap-2 px-4 pt-3 pb-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Professional Mode
        </button>
        {sub === "map-management" && <SettingsMapManagement />}
        {sub === "care-verification" && <CareVerificationPanel />}
        {sub === "care-management" && <CareManagementPanel />}
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <p className="text-sm font-bold">🛠️ Professional Mode</p>
        <p className="text-xs text-muted-foreground mt-1">
          Advanced management tools for platform administration.
        </p>
      </div>

      {/* Map Management */}
      <button
        onClick={() => setSub("map-management")}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/60"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Map className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">Map Management</p>
          <p className="text-xs text-muted-foreground">Add, edit & delete map locations</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Care Verification */}
      <button
        onClick={() => setSub("care-verification")}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/60"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">Care Verification</p>
          <p className="text-xs text-muted-foreground">Review provider verification requests</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Care Management */}
      <button
        onClick={() => setSub("care-management")}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/60"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">Care Management</p>
          <p className="text-xs text-muted-foreground">Manage providers, reviews & reports</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Future sections */}
      {futureSections.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-3 rounded-xl px-3 py-3 opacity-50 cursor-not-allowed"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <s.icon className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.description}</p>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            Coming Soon
          </span>
        </div>
      ))}
    </div>
  );
};

export default ProfessionalMode;
