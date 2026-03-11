import { useState, useRef } from "react";
import { X, Plus, Trash2, Clock, DollarSign, Save, Image as ImageIcon, Upload, Wallet, ArrowUpRight, MapPin, Zap } from "lucide-react";
import { useMyProvider, useProviderServices, useProviderAvailability, useProviderBookings, useProviderReviews, useProviderGallery, CATEGORIES, DAY_NAMES, type CareService } from "@/hooks/useCare";
import { useProviderBalance, useProviderPayments, useProviderPayouts } from "@/hooks/usePayments";
import { useProviderVerifications, VERIFICATION_TYPES } from "@/hooks/useVerification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, BadgeCheck, Calendar, CheckCircle2, XCircle, MessageSquare, AlertTriangle, Shield, FileCheck, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProviderDashboardProps {
  onClose: () => void;
}

const ProviderDashboard = ({ onClose }: ProviderDashboardProps) => {
  const { provider, loading, createProvider, updateProvider, addService, deleteService, setAvailability } = useMyProvider();
  const { services } = useProviderServices(provider?.id || null);
  const availability = useProviderAvailability(provider?.id || null);
  const { bookings, updateBookingStatus } = useProviderBookings(provider?.id || null);
  const { reviews } = useProviderReviews(provider?.id || null);
  const { images: galleryImages, addImage, removeImage } = useProviderGallery(provider?.id || null);
  const { balance } = useProviderBalance(provider?.id || null);
  const { payments: providerPayments } = useProviderPayments(provider?.id || null);
  const { payouts, requestPayout } = useProviderPayouts(provider?.id || null);
  const { verifications, submitVerification, deleteVerification, pendingCount, approvedCount, rejectedCount, isFullyVerified } = useProviderVerifications(provider?.id || null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"overview" | "services" | "bookings" | "hours" | "reviews" | "earnings" | "verification" | "settings">("overview");
  const [verDocType, setVerDocType] = useState("license");
  const [uploadingVerDoc, setUploadingVerDoc] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [creating, setCreating] = useState(!provider && !loading);

  // Create provider form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("dog_sitter");
  const [formLocation, setFormLocation] = useState("");
  const [formPhone, setFormPhone] = useState("");

  // Add service form
  const [showAddService, setShowAddService] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcDuration, setSvcDuration] = useState("30");

  // Settings
  const [emergencyAvail, setEmergencyAvail] = useState(provider?.emergency_available || false);
  const [cancelPolicy, setCancelPolicy] = useState(provider?.cancellation_policy || "Free cancellation up to 24 hours before appointment");
  const [cancelHours, setCancelHours] = useState(String(provider?.cancellation_hours || 24));
  const [serviceTowns, setServiceTowns] = useState<string[]>(() => {
    // Parse existing location as towns list
    const loc = provider?.location || "";
    return loc ? loc.split(",").map(t => t.trim()).filter(Boolean) : [];
  });
  const [bookingMode, setBookingMode] = useState((provider as any)?.booking_mode || "instant");

  // Gallery upload
  const [galleryUrl, setGalleryUrl] = useState("");

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

  const handleAddService = async () => {
    if (!svcName.trim() || !svcPrice) return;
    await addService({
      service_name: svcName.trim(),
      description: svcDesc.trim(),
      price: Number(svcPrice),
      duration: Number(svcDuration) || 30,
    });
    toast({ title: "Service added!" });
    setSvcName(""); setSvcDesc(""); setSvcPrice(""); setSvcDuration("30");
    setShowAddService(false);
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
              <label className="text-xs font-semibold text-muted-foreground">Category *</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} onClick={() => setFormCategory(c.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${formCategory === c.value ? "petkeep-gradient text-primary-foreground" : "bg-secondary"}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
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

  // Dashboard
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "services" as const, label: `Services (${services.length})` },
    { key: "bookings" as const, label: `Bookings (${pendingBookings.length})` },
    { key: "hours" as const, label: "Hours" },
    { key: "reviews" as const, label: `Reviews (${reviews.length})` },
    { key: "earnings" as const, label: "Earnings" },
    { key: "verification" as const, label: `Verify${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "settings" as const, label: "Settings" },
  ];

  const handleRequestPayout = async () => {
    const amt = Number(payoutAmount);
    if (!amt || amt <= 0 || amt > (balance?.available_balance || 0)) return;
    await requestPayout(amt);
    setPayoutAmount("");
    toast({ title: "Payout requested!", description: `${amt} MKD will be processed soon` });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="mx-auto max-w-lg min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold truncate flex-1">Care Dashboard</h1>
          {provider.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-border scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-4 py-2.5 text-xs font-bold transition-colors ${tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-4 py-4 pb-24">
          {/* Overview */}
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-card border border-border p-3 text-center">
                  <p className="font-display text-2xl font-extrabold text-primary">{Number(provider.avg_rating).toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                </div>
                <div className="rounded-2xl bg-card border border-border p-3 text-center">
                  <p className="font-display text-2xl font-extrabold text-primary">{provider.total_reviews}</p>
                  <p className="text-[10px] text-muted-foreground">Reviews</p>
                </div>
                <div className="rounded-2xl bg-card border border-border p-3 text-center">
                  <p className="font-display text-2xl font-extrabold text-primary">{provider.total_bookings}</p>
                  <p className="text-[10px] text-muted-foreground">Bookings</p>
                </div>
              </div>

              {/* Verification status */}
              {!isFullyVerified && (
                <button onClick={() => setTab("verification")} className="w-full rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-left">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Get Verified</p>
                      <p className="text-[10px] text-muted-foreground">Submit documents to earn a verified badge</p>
                    </div>
                  </div>
                </button>
              )}

              {pendingBookings.length > 0 && (
                <div className="rounded-2xl bg-card border border-border p-4">
                  <h3 className="text-sm font-bold mb-2">Pending Bookings ({pendingBookings.length})</h3>
                  {pendingBookings.slice(0, 3).map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-xs font-bold">{b.user_profile?.full_name || "User"}</p>
                        <p className="text-[10px] text-muted-foreground">{b.service?.service_name} · {b.booking_date} {b.booking_time}</p>
                        {b.pet && (
                          <p className="text-[10px] text-muted-foreground">🐾 {b.pet.name} ({b.pet.animal_type})</p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => updateBookingStatus(b.id, "confirmed")} className="rounded-full p-1.5 bg-accent/10 text-accent hover:bg-accent/20">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => updateBookingStatus(b.id, "cancelled")} className="rounded-full p-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Services */}
          {tab === "services" && (
            <div className="space-y-3">
              {!showAddService && (
                <button onClick={() => setShowAddService(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs font-bold text-primary hover:bg-secondary/30">
                  <Plus className="h-4 w-4" /> Add Service
                </button>
              )}

              {showAddService && (
                <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                  <input value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="Service name *"
                    className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none" />
                  <input value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} placeholder="Description"
                    className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none" />
                  <div className="flex gap-2">
                    <input value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} placeholder="Price (MKD)" type="number"
                      className="flex-1 rounded-xl bg-secondary px-3 py-2 text-sm outline-none" />
                    <input value={svcDuration} onChange={(e) => setSvcDuration(e.target.value)} placeholder="Min" type="number"
                      className="w-20 rounded-xl bg-secondary px-3 py-2 text-sm outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddService(false)} className="flex-1 rounded-xl border border-border py-2 text-xs font-bold">Cancel</button>
                    <button onClick={handleAddService} disabled={!svcName.trim() || !svcPrice}
                      className="flex-1 petkeep-gradient rounded-xl py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">Add</button>
                  </div>
                </div>
              )}

              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-2xl bg-card border border-border p-4">
                  <div>
                    <h3 className="text-sm font-bold">{s.service_name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {s.price} MKD</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration} min</span>
                    </div>
                  </div>
                  <button onClick={() => deleteService(s.id)} className="rounded-full p-1.5 hover:bg-destructive/10 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bookings */}
          {tab === "bookings" && (
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No bookings yet</p>
              ) : bookings.map((b) => {
                const statusColors: Record<string, string> = {
                  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                };
                return (
                  <div key={b.id} className="rounded-2xl bg-card border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary text-xs font-bold">
                            {b.user_profile?.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-bold">{b.user_profile?.full_name || "User"}</p>
                          <p className="text-[10px] text-muted-foreground">{b.service?.service_name}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[b.status] || "bg-secondary"}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.booking_date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                    </div>
                    {b.pet && (
                      <p className="mt-1 text-[10px] text-muted-foreground">🐾 {b.pet.name} ({b.pet.animal_type}{b.pet.breed ? ` · ${b.pet.breed}` : ""})</p>
                    )}
                    {b.notes && (
                      <p className="mt-1.5 text-[10px] text-muted-foreground italic rounded-lg bg-secondary/50 p-2">📝 {b.notes}</p>
                    )}
                    {b.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => updateBookingStatus(b.id, "confirmed")}
                          className="flex-1 petkeep-gradient rounded-xl py-2 text-xs font-bold text-primary-foreground">Accept</button>
                        <button onClick={() => updateBookingStatus(b.id, "cancelled")}
                          className="flex-1 rounded-xl border border-border py-2 text-xs font-bold text-destructive">Decline</button>
                      </div>
                    )}
                    {b.status === "confirmed" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => updateBookingStatus(b.id, "completed")}
                          className="flex-1 petkeep-gradient rounded-xl py-2 text-xs font-bold text-primary-foreground">Mark Complete</button>
                        {b.conversation_id && (
                          <button onClick={() => navigate("/messages")}
                            className="rounded-xl border border-border px-3 py-2 text-xs font-bold flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Chat
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Hours */}
          {tab === "hours" && (
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
                          className="rounded-lg bg-secondary px-2 py-1 text-xs outline-none" />
                        <span className="text-xs text-muted-foreground">to</span>
                        <input type="time" defaultValue={end}
                          onBlur={(e) => handleSetAvailability(i, start, e.target.value, true)}
                          className="rounded-lg bg-secondary px-2 py-1 text-xs outline-none" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reviews */}
          {tab === "reviews" && (
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No reviews yet</p>
              ) : reviews.map((r) => (
                <div key={r.id} className="rounded-2xl bg-card border border-border p-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary text-xs font-bold">
                        {r.profile?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-xs font-bold">{r.profile?.full_name || "User"}</p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-xs text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Earnings */}
          {tab === "earnings" && (
            <div className="space-y-4">
              {/* Balance cards */}
              <div className="rounded-2xl petkeep-gradient p-5 text-primary-foreground">
                <p className="text-xs font-semibold opacity-80">Available Balance</p>
                <p className="font-display text-3xl font-extrabold mt-1">
                  {(balance?.available_balance || 0).toLocaleString()} MKD
                </p>
                <p className="text-xs opacity-70 mt-0.5">💰 Ready for payout</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-card border border-border p-3 text-center">
                  <p className="font-display text-xl font-extrabold text-primary">{(balance?.total_earned || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Total Earned (MKD)</p>
                </div>
                <div className="rounded-2xl bg-card border border-border p-3 text-center">
                  <p className="font-display text-xl font-extrabold text-muted-foreground">{(balance?.total_platform_fees || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Platform Fees (10%)</p>
                </div>
              </div>

              {(balance?.pending_balance || 0) > 0 && (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Pending Payout</p>
                  <p className="font-display text-lg font-extrabold text-amber-700 dark:text-amber-300">{(balance?.pending_balance || 0).toLocaleString()} MKD</p>
                </div>
              )}

              {/* Request Payout */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Request Payout</h3>
                </div>
                <div className="flex gap-2">
                  <input
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    type="number"
                    placeholder="Amount (MKD)"
                    max={balance?.available_balance || 0}
                    className="flex-1 rounded-xl bg-secondary px-3 py-2 text-sm outline-none"
                  />
                  <button
                    onClick={handleRequestPayout}
                    disabled={!payoutAmount || Number(payoutAmount) <= 0 || Number(payoutAmount) > (balance?.available_balance || 0)}
                    className="petkeep-gradient rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 flex items-center gap-1"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Request
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground">💳 Simulated payouts · Stripe Connect coming soon</p>
              </div>

              {/* Recent Payments */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <h3 className="text-sm font-bold">Recent Payments</h3>
                {providerPayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
                ) : providerPayments.slice(0, 10).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-xs font-semibold">{p.total_amount} MKD</p>
                      <p className="text-[10px] text-muted-foreground">
                        Fee: {p.platform_fee} MKD · Net: {p.provider_earnings} MKD
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>

              {/* Payout History */}
              {payouts.length > 0 && (
                <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                  <h3 className="text-sm font-bold">Payout History</h3>
                  {payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-xs font-semibold">{p.amount} MKD</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : p.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Verification */}
          {tab === "verification" && (
            <div className="space-y-4">
              {/* Verification Status */}
              <div className={`rounded-2xl p-4 ${isFullyVerified ? "bg-accent/10 border border-accent/30" : "bg-card border border-border"}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isFullyVerified ? "bg-accent/20" : "bg-secondary"}`}>
                    {isFullyVerified ? <BadgeCheck className="h-6 w-6 text-accent" /> : <ShieldCheck className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{isFullyVerified ? "✅ Verified Provider" : "Verification Required"}</p>
                    <p className="text-xs text-muted-foreground">
                      {isFullyVerified
                        ? "Your profile displays the verified badge"
                        : `Submit at least 2 documents to get verified (${approvedCount}/2 approved)`}
                    </p>
                  </div>
                </div>
                {approvedCount > 0 && !isFullyVerified && (
                  <div className="mt-3 w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (approvedCount / 2) * 100)}%` }} />
                  </div>
                )}
              </div>

              {/* Stats */}
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

              {/* Upload New */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Submit Document</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {VERIFICATION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setVerDocType(t.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        verDocType === t.value ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleVerDocUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingVerDoc}
                  className="w-full petkeep-gradient rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingVerDoc ? "Uploading..." : "Upload Document"}
                </button>
              </div>

              {/* Submitted Documents */}
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
                            <p className="text-[10px] text-muted-foreground">{typeInfo?.label}</p>
                            {v.reviewer_notes && (
                              <p className="text-[10px] text-muted-foreground italic mt-0.5">📝 {v.reviewer_notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[v.status] || "bg-secondary"}`}>
                            {v.status}
                          </span>
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
          )}

          {tab === "settings" && (
            <div className="space-y-5">
              {/* Cancellation */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Cancellation Policy</h3>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Free cancellation window (hours)</label>
                  <input value={cancelHours} onChange={(e) => setCancelHours(e.target.value)} type="number"
                    className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Policy description</label>
                  <textarea value={cancelPolicy} onChange={(e) => setCancelPolicy(e.target.value)} rows={2}
                    className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none resize-none" />
                </div>
              </div>

              {/* Service Area - North Macedonia Towns */}
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
                      <button
                        key={town}
                        onClick={() => setServiceTowns(prev =>
                          selected ? prev.filter(t => t !== town) : [...prev, town]
                        )}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selected ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {town}
                      </button>
                    );
                  })}
                </div>
                {serviceTowns.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">{serviceTowns.length} town{serviceTowns.length !== 1 ? "s" : ""} selected</p>
                )}
              </div>

              {/* Booking Mode */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Booking Mode</h3>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setBookingMode("instant")}
                    className={`w-full rounded-xl p-3 text-left transition-colors ${bookingMode === "instant" ? "bg-primary/10 border border-primary/30" : "bg-secondary"}`}
                  >
                    <p className="text-xs font-bold">⚡ Instant Booking</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Bookings are confirmed immediately</p>
                  </button>
                  <button
                    onClick={() => setBookingMode("request")}
                    className={`w-full rounded-xl p-3 text-left transition-colors ${bookingMode === "request" ? "bg-primary/10 border border-primary/30" : "bg-secondary"}`}
                  >
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
                  <input value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)}
                    placeholder="Image URL"
                    className="flex-1 rounded-xl bg-secondary px-3 py-2 text-sm outline-none" />
                  <button onClick={handleAddGalleryImage} disabled={!galleryUrl.trim()}
                    className="petkeep-gradient rounded-xl px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
