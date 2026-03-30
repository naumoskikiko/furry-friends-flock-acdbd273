import { useState, useRef } from "react";
import {
  X, ChevronLeft, Plus, Trash2, Clock, DollarSign, Save, Image as ImageIcon,
  Upload, Wallet, ArrowUpRight, MapPin, Zap, Menu,
  BarChart3, Calendar, Star, BadgeCheck, Shield, FileCheck, ShieldCheck,
  MessageSquare, TrendingUp, Bell, Settings, Briefcase, Heart
} from "lucide-react";
import { useMyProvider, useProviderServices, useProviderAvailability, useProviderBookings, useProviderReviews, useProviderGallery, useProviderBlockedSlots, useProviderBookedSlots, useTrainingPackages, CATEGORIES, DAY_NAMES, getBookingTypeForCategory, getBookingTypeLabel } from "@/hooks/useCare";
import { useProviderBalance, useProviderPayments, useProviderPayouts } from "@/hooks/usePayments";
import { useProviderVerifications, VERIFICATION_TYPES } from "@/hooks/useVerification";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

import CareOverviewTab from "./tabs/CareOverviewTab";
import CareBookingsTab from "./tabs/CareBookingsTab";
import CareServicesTab from "./tabs/CareServicesTab";
import CareEarningsTab from "./tabs/CareEarningsTab";
import CareReviewsTab from "./tabs/CareReviewsTab";
import CareAnalyticsTab from "./tabs/CareAnalyticsTab";
import CareNotificationsTab from "./tabs/CareNotificationsTab";
import PetMatchTab from "./tabs/PetMatchTab";

const NORTH_MACEDONIA_TOWNS = [
  "Skopje", "Bitola", "Kumanovo", "Tetovo", "Ohrid", "Prilep", "Veles", "Štip",
  "Strumica", "Gostivar", "Kavadarci", "Kočani", "Kičevo", "Struga", "Radoviš",
  "Gevgelija", "Debar", "Kriva Palanka", "Sveti Nikole", "Negotino", "Delčevo",
  "Vinica", "Resen", "Probištip", "Berovo", "Kratovo", "Bogdanci", "Kruševo",
  "Makedonski Brod", "Valandovo", "Demir Hisar", "Pehčevo", "Demir Kapija",
  "Makedonska Kamenica", "Star Dojran",
];

interface ProviderDashboardProps {
  onClose: () => void;
}

type TabKey = "overview" | "bookings" | "services" | "hours" | "reviews" | "earnings" | "verification" | "settings" | "analytics" | "notifications";

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "bookings", label: "Bookings", icon: Calendar },
  { key: "services", label: "Services", icon: Briefcase },
  { key: "hours", label: "Availability", icon: Clock },
  { key: "earnings", label: "Earnings", icon: DollarSign },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "analytics", label: "Analytics", icon: TrendingUp },
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "notifications", label: "Notifications", icon: Bell },
];

const ProviderDashboard = ({ onClose }: ProviderDashboardProps) => {
  const { provider, loading, createProvider, updateProvider, addService, deleteService, setAvailability } = useMyProvider();
  const { services } = useProviderServices(provider?.id || null);
  const availability = useProviderAvailability(provider?.id || null);
  const { bookings, updateBookingStatus } = useProviderBookings(provider?.id || null);
  const { reviews } = useProviderReviews(provider?.id || null);
  const { images: galleryImages, addImage, removeImage } = useProviderGallery(provider?.id || null);
  const { blockedSlots, addBlock, removeBlock } = useProviderBlockedSlots(provider?.id || null);
  const { bookedDates } = useProviderBookedSlots(provider?.id || null);
  const isTrainer = provider?.category === "trainer";
  const { packages: trainingPackages, addPackage: addTrainingPackage, deletePackage: deleteTrainingPackage } = useTrainingPackages(isTrainer ? provider?.id || null : null);
  const { balance } = useProviderBalance(provider?.id || null);
  const { payments: providerPayments } = useProviderPayments(provider?.id || null);
  const { payouts, requestPayout } = useProviderPayouts(provider?.id || null);
  const { verifications, submitVerification, deleteVerification, pendingCount, approvedCount, rejectedCount, isFullyVerified } = useProviderVerifications(provider?.id || null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creating, setCreating] = useState(!provider && !loading);

  // Create provider form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("sitter");
  const [formLocation, setFormLocation] = useState("");
  const [formPhone, setFormPhone] = useState("");

  // Settings state
  const [cancelPolicy, setCancelPolicy] = useState(provider?.cancellation_policy || "Free cancellation up to 24 hours before appointment");
  const [cancelHours, setCancelHours] = useState(String(provider?.cancellation_hours || 24));
  const [serviceTowns, setServiceTowns] = useState<string[]>(() => {
    const loc = provider?.location || "";
    return loc ? loc.split(",").map(t => t.trim()).filter(Boolean) : [];
  });
  const [bookingMode, setBookingMode] = useState((provider as any)?.booking_mode || "instant");
  const [galleryUrl, setGalleryUrl] = useState("");

  // Blocking
  const [blockDate, setBlockDate] = useState("");
  const [blockTime, setBlockTime] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Verification
  const [verDocType, setVerDocType] = useState("license");
  const [uploadingVerDoc, setUploadingVerDoc] = useState(false);

  const handleCreateProvider = async () => {
    if (!formName.trim()) return;
    try {
      await createProvider({
        business_name: formName.trim(),
        description: formDesc.trim(),
        category: formCategory,
        location: formLocation.trim(),
        phone: formPhone.trim(),
      });
      toast({ title: "Care provider profile created!" });
      setCreating(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSetAvailability = async (day: number, start: string, end: string, available: boolean) => {
    await setAvailability(day, start, end, available);
    toast({ title: `${DAY_NAMES[day]} updated` });
  };

  const handleSaveSettings = async () => {
    await updateProvider({
      cancellation_policy: cancelPolicy,
      cancellation_hours: Number(cancelHours) || 24,
      location: serviceTowns.join(", "),
      booking_mode: bookingMode,
    } as any);
    toast({ title: "Settings saved!" });
  };

  const handleVerDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVerDoc(true);
    try {
      await submitVerification(verDocType, file);
      toast({ title: "Document submitted for verification!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingVerDoc(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddGalleryImage = async () => {
    if (!galleryUrl.trim()) return;
    await addImage(galleryUrl.trim());
    setGalleryUrl("");
    toast({ title: "Image added to gallery!" });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Create provider flow
  if (!provider || creating) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <div className="mx-auto max-w-lg min-h-screen">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
              <X className="h-5 w-5" />
            </button>
            <h1 className="font-display text-lg font-bold">Become a Care Provider</h1>
          </div>
          <div className="px-4 py-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Business / Clinic Name *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" placeholder="Happy Paws Vet" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Service Type *</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} onClick={() => setFormCategory(c.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${formCategory === c.value ? "petkeep-gradient text-primary-foreground" : "bg-secondary"}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              {/* Booking type indicator */}
              <div className="mt-2 rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary">Booking System</p>
                  <p className="text-[10px] text-muted-foreground">
                    {getBookingTypeLabel(getBookingTypeForCategory(formCategory))}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none resize-none" placeholder="Tell users about your services..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" placeholder="City, Address" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Phone</label>
              <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" placeholder="+389 XX XXX XXX" />
            </div>
            <button onClick={handleCreateProvider} disabled={!formName.trim()}
              className="w-full petkeep-gradient rounded-xl py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
              Create Care Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const notifCount = pendingBookings.length + (isFullyVerified ? 0 : 1);

  const renderContent = () => {
    switch (tab) {
      case "overview":
        return (
          <CareOverviewTab
            provider={provider}
            bookings={bookings}
            reviews={reviews}
            balance={balance}
            payments={providerPayments}
            isFullyVerified={isFullyVerified}
            onTabChange={(t) => setTab(t as TabKey)}
          />
        );
      case "bookings":
        return <CareBookingsTab bookings={bookings} updateBookingStatus={updateBookingStatus} />;
      case "services":
        return <CareServicesTab services={services} addService={addService} deleteService={deleteService} isTrainer={isTrainer} trainingPackages={trainingPackages} addTrainingPackage={addTrainingPackage} deleteTrainingPackage={deleteTrainingPackage} />;
      case "earnings":
        return <CareEarningsTab balance={balance} payments={providerPayments} payouts={payouts} requestPayout={requestPayout} />;
      case "reviews":
        return <CareReviewsTab reviews={reviews} avgRating={provider.avg_rating} totalReviews={provider.total_reviews} />;
      case "analytics":
        return <CareAnalyticsTab provider={provider} bookings={bookings} reviews={reviews} payments={providerPayments} />;
      case "notifications":
        return <CareNotificationsTab bookings={bookings} reviews={reviews} isFullyVerified={isFullyVerified} pendingVerifications={pendingCount} />;

      case "hours":
        return (
          <div className="space-y-4">
            {/* Weekly schedule */}
            <div>
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Weekly Schedule
              </h3>
              <div className="space-y-2">
                {DAY_NAMES.map((day, i) => {
                  const avail = availability.find((a) => a.day_of_week === i);
                  const isAvailable = avail?.is_available ?? false;
                  const start = avail?.start_time?.slice(0, 5) || "09:00";
                  const end = avail?.end_time?.slice(0, 5) || "17:00";
                  return (
                    <div key={i} className="rounded-xl bg-card border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{day}</span>
                        <button
                          onClick={() => handleSetAvailability(i, start, end, !isAvailable)}
                          className={`rounded-full px-3 py-1 text-[10px] font-bold transition-colors ${isAvailable ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}
                        >
                          {isAvailable ? "Open" : "Closed"}
                        </button>
                      </div>
                      {isAvailable && (
                        <div className="flex items-center gap-2 mt-2">
                          <input type="time" defaultValue={start}
                            onBlur={(e) => handleSetAvailability(i, e.target.value, end, true)}
                            className="rounded-lg bg-secondary px-2 py-1.5 text-xs outline-none" />
                          <span className="text-xs text-muted-foreground">to</span>
                          <input type="time" defaultValue={end}
                            onBlur={(e) => handleSetAvailability(i, start, e.target.value, true)}
                            className="rounded-lg bg-secondary px-2 py-1.5 text-xs outline-none" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Block time / busy hours */}
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-bold">Block Time / Busy Hours</h3>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Block specific dates or time slots. Users won't be able to book during blocked periods.
              </p>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Date to block</label>
                  <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="mt-0.5 w-full rounded-xl bg-secondary px-3 py-2 text-xs outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Time slot (leave empty to block full day)</label>
                  <input type="time" value={blockTime} onChange={(e) => setBlockTime(e.target.value)}
                    className="mt-0.5 w-full rounded-xl bg-secondary px-3 py-2 text-xs outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Reason (optional)</label>
                  <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g. Personal day"
                    className="mt-0.5 w-full rounded-xl bg-secondary px-3 py-2 text-xs outline-none" />
                </div>
                <button
                  onClick={async () => {
                    if (!blockDate) return;
                    await addBlock(blockDate, blockTime || undefined, blockReason || undefined);
                    toast({ title: blockTime ? "Time slot blocked" : "Full day blocked" });
                    setBlockDate(""); setBlockTime(""); setBlockReason("");
                  }}
                  disabled={!blockDate}
                  className="w-full rounded-xl py-2 text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  Block {blockTime ? "Time Slot" : "Full Day"}
                </button>
              </div>
            </div>

            {/* Active blocks + booked dates */}
            {(blockedSlots.length > 0 || bookedDates.size > 0) && (
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Calendar Overview
                </h3>

                {/* Blocked slots */}
                {blockedSlots.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-destructive">🚫 Blocked</p>
                    {blockedSlots.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                        <div>
                          <span className="text-xs font-semibold">{b.blocked_date}</span>
                          {b.blocked_time && <span className="text-xs text-muted-foreground ml-2">@ {b.blocked_time.slice(0, 5)}</span>}
                          {b.reason && <span className="text-[10px] text-muted-foreground ml-2">({b.reason})</span>}
                        </div>
                        <button onClick={() => removeBlock(b.id)} className="rounded-full p-1 hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Booked dates */}
                {bookedDates.size > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-primary">📅 Booked Dates</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(bookedDates).sort().slice(0, 20).map((d) => (
                        <span key={d} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">{d}</span>
                      ))}
                      {bookedDates.size > 20 && <span className="text-[10px] text-muted-foreground">+{bookedDates.size - 20} more</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "verification":
        return (
          <div className="space-y-4">
            <div className={`rounded-2xl p-4 ${isFullyVerified ? "bg-accent/10 border border-accent/30" : "bg-card border border-border"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isFullyVerified ? "bg-accent/20" : "bg-secondary"}`}>
                  {isFullyVerified ? <BadgeCheck className="h-6 w-6 text-accent" /> : <ShieldCheck className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-bold">{isFullyVerified ? "✅ Verified Provider" : "Verification Required"}</p>
                  <p className="text-xs text-muted-foreground">
                    {isFullyVerified ? "Your profile displays the verified badge" : `Submit at least 2 documents (${approvedCount}/2 approved)`}
                  </p>
                </div>
              </div>
              {approvedCount > 0 && !isFullyVerified && (
                <div className="mt-3 w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (approvedCount / 2) * 100)}%` }} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="font-display text-lg font-bold text-primary">{approvedCount}</p>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="font-display text-lg font-bold text-amber-600">{pendingCount}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="font-display text-lg font-bold text-destructive">{rejectedCount}</p>
                <p className="text-[10px] text-muted-foreground">Rejected</p>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Submit Document</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {VERIFICATION_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setVerDocType(t.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      verDocType === t.value ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleVerDocUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingVerDoc}
                className="w-full petkeep-gradient rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" />
                {uploadingVerDoc ? "Uploading..." : "Upload Document"}
              </button>
            </div>

            {verifications.length > 0 && (
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <h3 className="text-sm font-bold">Submitted Documents</h3>
                {verifications.map((v) => {
                  const typeInfo = VERIFICATION_TYPES.find((t) => t.value === v.verification_type);
                  const statusStyle: Record<string, string> = {
                    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                    approved: "bg-accent/10 text-accent",
                    rejected: "bg-destructive/10 text-destructive",
                  };
                  return (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{typeInfo?.icon || "📄"}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{v.document_name || typeInfo?.label}</p>
                          {v.reviewer_notes && <p className="text-[10px] text-muted-foreground italic">📝 {v.reviewer_notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[v.status] || "bg-secondary"}`}>{v.status}</span>
                        {v.status === "pending" && (
                          <button onClick={() => deleteVerification(v.id)} className="rounded-full p-1 hover:bg-destructive/10 text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "settings":
        return (
          <div className="space-y-5">
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Cancellation Policy</h3>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Free cancellation window (hours)</label>
                <input value={cancelHours} onChange={(e) => setCancelHours(e.target.value)} type="number"
                  className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Policy description</label>
                <textarea value={cancelPolicy} onChange={(e) => setCancelPolicy(e.target.value)} rows={2}
                  className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none resize-none" />
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Service Area</h3>
              </div>
              <p className="text-xs text-muted-foreground">Select the towns where you offer services</p>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {NORTH_MACEDONIA_TOWNS.map((town) => {
                  const selected = serviceTowns.includes(town);
                  return (
                    <button key={town} onClick={() => setServiceTowns(prev =>
                      selected ? prev.filter(t => t !== town) : [...prev, town]
                    )}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}>
                      {town}
                    </button>
                  );
                })}
              </div>
              {serviceTowns.length > 0 && <p className="text-[10px] text-muted-foreground">{serviceTowns.length} town{serviceTowns.length !== 1 ? "s" : ""} selected</p>}
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Booking Mode</h3>
              </div>
              <div className="space-y-2">
                <button onClick={() => setBookingMode("instant")}
                  className={`w-full rounded-xl p-3 text-left transition-colors ${bookingMode === "instant" ? "bg-primary/10 border border-primary/30" : "bg-secondary"}`}>
                  <p className="text-xs font-bold">⚡ Instant Booking</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Bookings are confirmed immediately</p>
                </button>
                <button onClick={() => setBookingMode("request")}
                  className={`w-full rounded-xl p-3 text-left transition-colors ${bookingMode === "request" ? "bg-primary/10 border border-primary/30" : "bg-secondary"}`}>
                  <p className="text-xs font-bold">📋 Request Booking</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">You review and approve each booking manually</p>
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Gallery ({galleryImages.length})</h3>
              </div>
              <div className="flex gap-2">
                <input value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)} placeholder="Image URL"
                  className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none" />
                <button onClick={handleAddGalleryImage} disabled={!galleryUrl.trim()}
                  className="petkeep-gradient rounded-xl px-3 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.map((img) => (
                    <div key={img.id} className="relative rounded-lg overflow-hidden aspect-square bg-secondary group">
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 rounded-full bg-destructive/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3 w-3 text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleSaveSettings}
              className="w-full petkeep-gradient rounded-xl py-3 text-sm font-bold text-primary-foreground flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> Save Settings
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* SIDEBAR — desktop only */}
      {!isMobile && (
        <aside className={`h-full bg-card border-r border-border flex flex-col transition-all duration-200 ${sidebarOpen ? "w-56" : "w-14"}`}>
          <div className="h-14 flex items-center gap-2 px-3 border-b border-border shrink-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-1.5 hover:bg-secondary">
              <Menu className="h-4 w-4" />
            </button>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{provider.business_name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{provider.category}</p>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
            {tabs.map((t) => {
              const isActive = tab === t.key;
              const badge = t.key === "bookings" && pendingBookings.length > 0;
              const notifBadge = t.key === "notifications" && notifCount > 0;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors relative ${
                    isActive ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  title={!sidebarOpen ? t.label : undefined}
                >
                  <t.icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && <span className="truncate">{t.label}</span>}
                  {(badge || notifBadge) && (
                    <span className={`${sidebarOpen ? "ml-auto" : "absolute -top-0.5 -right-0.5"} flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-1`}>
                      {badge ? pendingBookings.length : notifCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-border p-2">
            <button onClick={onClose} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>Exit Dashboard</span>}
            </button>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background shrink-0">
          {isMobile && (
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="font-display text-base font-bold flex-1 truncate">
            {tabs.find((t) => t.key === tab)?.label || "Care Dashboard"}
          </h1>
          {provider.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
          {notifCount > 0 && tab !== "notifications" && (
            <button onClick={() => setTab("notifications")} className="relative rounded-full p-1.5 hover:bg-secondary">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[7px] font-bold px-0.5">
                {notifCount}
              </span>
            </button>
          )}
        </header>

        {/* Mobile tab bar */}
        {isMobile && (
          <div className="flex overflow-x-auto border-b border-border scrollbar-hide bg-background">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-shrink-0 py-2.5 px-3 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap relative ${
                  tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                }`}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
                {t.key === "bookings" && pendingBookings.length > 0 && (
                  <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[7px] font-bold px-0.5">
                    {pendingBookings.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className={`mx-auto px-4 py-4 pb-20 ${isMobile ? "max-w-lg" : "max-w-2xl"}`}>
            {/* Verification Status Banner */}
            {!provider.is_verified && (
              <div className={`mb-4 rounded-2xl border p-4 ${
                (provider as any).is_banned
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-amber-500/30 bg-amber-50 dark:bg-amber-900/10"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    (provider as any).is_banned ? "bg-destructive/10" : "bg-amber-100 dark:bg-amber-900/30"
                  }`}>
                    <span className="text-lg">{(provider as any).is_banned ? "❌" : "⏳"}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      {(provider as any).is_banned ? "Provider Rejected" : "Pending Verification"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(provider as any).is_banned
                        ? "Your provider profile has been rejected. Contact support for details."
                        : "Your profile is under review. You won't appear in search results until verified by an admin."}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {provider.is_verified && tab === "overview" && (
              <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-50 dark:bg-green-900/10 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <p className="text-xs font-bold text-green-700 dark:text-green-400">Provider Verified — You are visible to all users</p>
                </div>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProviderDashboard;
