import { useState } from "react";
import { Map, BarChart3, ShieldCheck, Store, ChevronRight, ArrowLeft, Users, Crown, Zap, DollarSign, Sliders, TrendingUp, UserCog, Heart, Coins, CalendarDays, Settings, Package, Home, PawPrint } from "lucide-react";
import SettingsMapManagement from "./SettingsMapManagement";
import CareVerificationPanel from "./CareVerificationPanel";
import CareManagementPanel from "./CareManagementPanel";
import MarketplaceManagementPanel from "./MarketplaceManagementPanel";
import RoleManagementPanel from "./RoleManagementPanel";
import PromotionManagementPanel from "./PromotionManagementPanel";
import PlatformDashboard from "./PlatformDashboard";
import UserManagementPanel from "./UserManagementPanel";
import PlatformAnalyticsPanel from "./PlatformAnalyticsPanel";
import AlgorithmControlPanel from "./AlgorithmControlPanel";
import FinancialControlPanel from "./FinancialControlPanel";
import PetMatchManagementPanel from "./PetMatchManagementPanel";
import CreditManagementPanel from "./CreditManagementPanel";
import BookingManagementPanel from "./BookingManagementPanel";
import ServiceAvailabilityPanel from "./ServiceAvailabilityPanel";
import OrderManagementPanel from "./OrderManagementPanel";
import ShelterManagementPanel from "./ShelterManagementPanel";
import { useIsOwner } from "@/hooks/useIsOwner";

type SubSection =
  | "dashboard"
  | "map-management"
  | "care-verification"
  | "care-management"
  | "marketplace-control"
  | "role-management"
  | "promotions"
  | "user-management"
  | "analytics"
  | "algorithm"
  | "financial"
  | "petmatch"
  | "credits"
  | "bookings"
  | "services"
  | "orders"
  | "shelter";

const ProfessionalMode = () => {
  const [sub, setSub] = useState<SubSection>("dashboard");
  const { isOwner } = useIsOwner();

  if (sub !== "dashboard") {
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
        {sub === "marketplace-control" && <MarketplaceManagementPanel />}
        {sub === "role-management" && <RoleManagementPanel />}
        {sub === "promotions" && <PromotionManagementPanel />}
        {sub === "user-management" && <UserManagementPanel />}
        {sub === "analytics" && <PlatformAnalyticsPanel />}
        {sub === "algorithm" && <AlgorithmControlPanel />}
        {sub === "financial" && <FinancialControlPanel />}
        {sub === "petmatch" && <PetMatchManagementPanel />}
        {sub === "credits" && <CreditManagementPanel />}
        {sub === "bookings" && <BookingManagementPanel />}
        {sub === "services" && <ServiceAvailabilityPanel />}
        {sub === "orders" && <OrderManagementPanel />}
        {sub === "shelter" && <ShelterManagementPanel />}
      </div>
    );
  }

  const operationsSections = [
    { id: "bookings" as const, label: "Booking Management", desc: "View, accept, reject & complete bookings", icon: CalendarDays, color: "bg-blue-500/10 text-blue-500" },
    { id: "services" as const, label: "Services & Availability", desc: "Manage services, hours & schedules", icon: Settings, color: "bg-teal-500/10 text-teal-500" },
    { id: "orders" as const, label: "Order Management", desc: "Track, confirm & fulfill orders", icon: Package, color: "bg-indigo-500/10 text-indigo-500" },
    { id: "shelter" as const, label: "Shelter & Adoption", desc: "Manage adoption listings & status", icon: Home, color: "bg-pink-500/10 text-pink-500" },
  ];

  const sections = [
    { id: "map-management" as const, label: "Map Management", desc: "Add, edit & delete map locations", icon: Map, color: "bg-primary/10 text-primary" },
    { id: "care-verification" as const, label: "Care Verification", desc: "Review provider verification requests", icon: ShieldCheck, color: "bg-primary/10 text-primary" },
    { id: "care-management" as const, label: "Care Management", desc: "Manage providers, reviews & reports", icon: Users, color: "bg-primary/10 text-primary" },
    { id: "marketplace-control" as const, label: "Marketplace Control", desc: "Manage stores, products & listings", icon: Store, color: "bg-primary/10 text-primary" },
    { id: "petmatch" as const, label: "PetMatch Management", desc: "Verify breeders, reports & analytics", icon: Heart, color: "bg-pink-500/10 text-pink-500" },
    { id: "user-management" as const, label: "User Management", desc: "View users, manage accounts & content", icon: UserCog, color: "bg-blue-500/10 text-blue-500" },
    { id: "promotions" as const, label: "Promotion Management", desc: "Boosts, pricing & revenue tracking", icon: Zap, color: "bg-amber-500/10 text-amber-500" },
    { id: "financial" as const, label: "Financial Control", desc: "Revenue, commissions & transactions", icon: DollarSign, color: "bg-emerald-500/10 text-emerald-600" },
    { id: "analytics" as const, label: "Platform Analytics", desc: "Top stores, providers & growth metrics", icon: TrendingUp, color: "bg-indigo-500/10 text-indigo-500" },
    { id: "credits" as const, label: "PetKeep Credits", desc: "Manage credit economy & user balances", icon: Coins, color: "bg-amber-500/10 text-amber-500" },
  ];

  const ownerSections = [
    { id: "algorithm" as const, label: "Algorithm Control", desc: "Tune discovery ranking weights", icon: Sliders, color: "bg-purple-500/10 text-purple-500" },
    { id: "role-management" as const, label: "Role Management", desc: "Assign roles, promote & demote admins", icon: Crown, color: "bg-amber-500/10 text-amber-600" },
  ];

  const renderSection = (items: { id: SubSection; label: string; desc: string; icon: any; color: string }[]) => items.map(s => (
    <button
      key={s.id}
      onClick={() => setSub(s.id)}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/60"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${s.color}`}>
        <s.icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold">{s.label}</p>
        <p className="text-xs text-muted-foreground">{s.desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  ));

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <p className="text-sm font-bold">🛠️ Professional Mode</p>
        <p className="text-xs text-muted-foreground mt-1">
          Platform control center for administration & management.
        </p>
      </div>

      {/* Platform Dashboard */}
      <PlatformDashboard />

      {/* Operations */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 pt-2">Operations</p>
        {renderSection(operationsSections)}
      </div>

      {/* Management Sections */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 pt-2">Management</p>
        {renderSection(sections)}
      </div>

      {/* Owner-only sections */}
      {isOwner && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 pt-2">Owner Controls</p>
          {renderSection(ownerSections)}
        </div>
      )}
    </div>
  );
};

export default ProfessionalMode;
