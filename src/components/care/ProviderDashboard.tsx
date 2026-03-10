import { useState } from "react";
import { X, Plus, Trash2, Clock, DollarSign, Save, Image as ImageIcon, Upload, Wallet, ArrowUpRight } from "lucide-react";
import { useMyProvider, useProviderServices, useProviderAvailability, useProviderBookings, useProviderReviews, useProviderGallery, CATEGORIES, DAY_NAMES, type CareService } from "@/hooks/useCare";
import { useProviderBalance, useProviderPayments, useProviderPayouts } from "@/hooks/usePayments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, BadgeCheck, Calendar, CheckCircle2, XCircle, MessageSquare, AlertTriangle, Shield } from "lucide-react";
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
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"overview" | "services" | "bookings" | "hours" | "reviews" | "settings">("overview");
  const [creating, setCreating] = useState(!provider && !loading);

  // Create provider form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("veterinarian");
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
      emergency_available: emergencyAvail,
      cancellation_policy: cancelPolicy,
      cancellation_hours: Number(cancelHours) || 24,
    } as any);
    toast({ title: "Settings saved!" });
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
    { key: "settings" as const, label: "Settings" },
  ];

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

          {/* Settings */}
          {tab === "settings" && (
            <div className="space-y-5">
              {/* Emergency */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-bold">Emergency Care</h3>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Accept emergency / urgent visits</p>
                  <button
                    onClick={() => setEmergencyAvail(!emergencyAvail)}
                    className={`rounded-full px-3 py-1 text-[10px] font-bold transition-colors ${emergencyAvail ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}
                  >
                    {emergencyAvail ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

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

              {/* Gallery */}
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
