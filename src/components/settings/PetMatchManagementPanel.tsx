import { useState, useEffect, useCallback } from "react";
import {
  Heart, ShieldCheck, BadgeCheck, Search, ChevronDown, Eye, Trash2,
  Ban, AlertTriangle, Star, Users, TrendingUp, BarChart3, CheckCircle,
  XCircle, FileText, MessageCircle, Clock, Zap, DollarSign, ArrowLeft,
  X, Flag, PawPrint, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getBreederTrustScore } from "@/lib/petMatchAlgorithm";

const fromTable = (table: string) => (supabase as any).from(table);

interface PetMatchListingAdmin {
  id: string;
  user_id: string;
  pet_id: string;
  status: string;
  looking_for: string;
  description: string;
  is_active: boolean;
  breed_document_url: string | null;
  breed_document_name: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
  pet?: { id: string; name: string; animal_type: string; breed: string | null; gender: string | null; age: string | null; photo_url: string | null; neutered: boolean | null; vaccinated: boolean | null };
  profile?: { full_name: string; avatar_url: string | null; username: string | null; user_id: string };
}

interface PetMatchReport {
  id: string;
  listing_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string;
  evidence_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  listing?: PetMatchListingAdmin;
  reporter?: { full_name: string; username: string | null };
}

type AdminTab = "verification" | "listings" | "reports" | "analytics";

// ─── Verification Detail Modal ──────────────────────────────────────────────
const VerificationDetail = ({
  listing,
  onAction,
  onClose,
}: {
  listing: PetMatchListingAdmin;
  onAction: (id: string, action: "approved" | "rejected" | "pending") => void;
  onClose: () => void;
}) => {
  const [adminNote, setAdminNote] = useState("");
  const [petDocs, setPetDocs] = useState<Array<{ id: string; verification_type: string; document_url: string; document_name: string; status: string; created_at: string; reviewer_notes: string | null }>>([]);
  const [viewDoc, setViewDoc] = useState<{ url: string; isPdf: boolean } | null>(null);
  const pet = listing.pet;
  const trust = getBreederTrustScore(listing);

  useEffect(() => {
    if (!pet?.id) return;
    (async () => {
      const { data } = await fromTable("pet_verifications")
        .select("id, verification_type, document_url, document_name, status, created_at, reviewer_notes")
        .eq("pet_id", pet.id)
        .order("created_at", { ascending: false });
      setPetDocs((data || []) as any);
    })();
  }, [pet?.id]);

  const openDoc = async (doc: { document_url: string; document_name: string }) => {
    const match = doc.document_url.match(/\/object\/sign\/pet-verification-docs\/([^?]+)/);
    let url = doc.document_url;
    if (match) {
      const path = decodeURIComponent(match[1]);
      const { data } = await supabase.storage
        .from("pet-verification-docs")
        .createSignedUrl(path, 60 * 60);
      if (data?.signedUrl) url = data.signedUrl;
    }
    setViewDoc({ url, isPdf: (doc.document_name || "").toLowerCase().endsWith(".pdf") });
  };

  const TYPE_LABELS: Record<string, string> = {
    vaccination: "💉 Vaccination",
    neutered: "✂️ Neutered/Spayed",
    health_certificate: "📋 Health Certificate",
    pet_passport: "📘 Pet Passport",
    ownership_proof: "🪪 Ownership Proof",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col bg-card rounded-t-2xl shadow-lg sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 shrink-0">
          <h3 className="font-display text-sm font-bold">Verification Review</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
          {/* Pet info */}
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage src={pet?.photo_url || undefined} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl font-bold">{pet?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-display text-base font-bold">{pet?.name}</h4>
              <p className="text-xs text-muted-foreground">{pet?.breed || "Unknown breed"} · {pet?.gender} · {pet?.age}</p>
              <p className="text-xs text-muted-foreground capitalize">{pet?.animal_type}</p>
              <div className="flex items-center gap-2 mt-1">
                {pet?.vaccinated && <span className="text-[9px] font-bold bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">💉 Vaccinated</span>}
                {pet?.neutered === false && <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full">✓ Fertile</span>}
                {pet?.neutered === true && <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">⚠ Neutered</span>}
              </div>
            </div>
          </div>

          {/* Owner */}
          <div className="rounded-xl bg-secondary/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Owner</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={listing.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10">{listing.profile?.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{listing.profile?.full_name}</p>
                {listing.profile?.username && <p className="text-[10px] text-muted-foreground">@{listing.profile.username}</p>}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold">{trust.score.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Listing details */}
          <div className="rounded-xl bg-secondary/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Listing Info</p>
            {listing.looking_for && <p className="text-xs"><span className="font-semibold">Looking for:</span> {listing.looking_for}</p>}
            {listing.description && <p className="text-xs text-muted-foreground mt-1">{listing.description}</p>}
            <p className="text-[10px] text-muted-foreground mt-1.5">Created: {new Date(listing.created_at).toLocaleDateString()}</p>
          </div>

          {/* Documents */}
          <div className="rounded-xl bg-secondary/50 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pet Verification Documents</p>

            {petDocs.length === 0 && !listing.breed_document_url ? (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-xs font-semibold">No documents uploaded</p>
              </div>
            ) : (
              <>
                {petDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-card border border-border p-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{TYPE_LABELS[doc.verification_type] || doc.verification_type}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{doc.document_name}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${
                      doc.status === "verified" ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
                      doc.status === "rejected" ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400" :
                      "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                    }`}>{doc.status}</span>
                    <button
                      onClick={() => openDoc(doc)}
                      className="text-[10px] font-bold text-primary hover:underline shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {listing.breed_document_url && (
                  <div className="flex items-center gap-2 rounded-lg bg-card border border-border p-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <a href={listing.breed_document_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-primary hover:underline flex-1 truncate">
                      🐕 Breed: {listing.breed_document_name || "View"}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Document viewer overlay */}
          {viewDoc && (
            <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
              <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setViewDoc(null)} className="absolute -top-10 right-0 text-white"><X className="h-5 w-5" /></button>
                {viewDoc.isPdf ? (
                  <iframe src={viewDoc.url} className="w-full h-[80vh] rounded-lg bg-white" />
                ) : (
                  <img src={viewDoc.url} alt="Document" className="w-full max-h-[80vh] rounded-lg object-contain" />
                )}
              </div>
            </div>
          )}

          {/* Admin note */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Admin Notes</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Add internal notes..."
              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 -mx-4 border-t border-border bg-card px-4 pt-3 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                onClick={() => onAction(listing.id, "rejected")}
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-bold text-destructive"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button
                onClick={() => onAction(listing.id, "pending")}
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm font-bold text-amber-600"
              >
                <Clock className="h-4 w-4" /> Request More
              </button>
              <button
                onClick={() => onAction(listing.id, "approved")}
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-green-500/10 px-3 py-2.5 text-sm font-bold text-green-600"
              >
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Admin Panel ───────────────────────────────────────────────────────
const PetMatchManagementPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<AdminTab>("verification");
  const [listings, setListings] = useState<PetMatchListingAdmin[]>([]);
  const [reports, setReports] = useState<PetMatchReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<PetMatchListingAdmin | null>(null);
  const [verificationFilter, setVerificationFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Fetch all listings
    const { data: listingsData } = await fromTable("petmatch_listings").select("*").order("created_at", { ascending: false });
    const allListings = (listingsData || []) as PetMatchListingAdmin[];

    if (allListings.length > 0) {
      const petIds = allListings.map((l) => l.pet_id);
      const userIds = [...new Set(allListings.map((l) => l.user_id))];
      const [petsData, profilesData] = await Promise.all([
        supabase.from("pets").select("id, name, animal_type, breed, gender, age, photo_url, neutered, vaccinated").in("id", petIds),
        supabase.from("profiles").select("user_id, full_name, avatar_url, username").in("user_id", userIds),
      ]);
      const petsMap = Object.fromEntries((petsData.data || []).map((p: any) => [p.id, p]));
      const profilesMap = Object.fromEntries((profilesData.data || []).map((p: any) => [p.user_id, p]));
      allListings.forEach((l) => {
        l.pet = petsMap[l.pet_id];
        l.profile = profilesMap[l.user_id];
      });
    }
    setListings(allListings);

    // Fetch reports
    const { data: reportsData } = await fromTable("petmatch_reports").select("*").order("created_at", { ascending: false });
    const allReports = (reportsData || []) as PetMatchReport[];
    if (allReports.length > 0) {
      const reporterIds = [...new Set(allReports.map((r) => r.reporter_id))];
      const { data: reporterProfiles } = await supabase.from("profiles").select("user_id, full_name, username").in("user_id", reporterIds);
      const reporterMap = Object.fromEntries((reporterProfiles || []).map((p: any) => [p.user_id, p]));
      allReports.forEach((r) => {
        r.reporter = reporterMap[r.reporter_id];
        r.listing = allListings.find((l) => l.id === r.listing_id);
      });
    }
    setReports(allReports);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerificationAction = async (listingId: string, status: "approved" | "rejected" | "pending") => {
    const updateData: any = { status };
    if (status === "approved") {
      updateData.verified_at = new Date().toISOString();
      updateData.verified_by = user?.id;
      updateData.is_active = true;
    } else if (status === "rejected") {
      updateData.is_active = false;
    }

    const { error } = await fromTable("petmatch_listings").update(updateData).eq("id", listingId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Listing ${status}`, description: status === "approved" ? "Pet now has Verified Breed badge" : status === "rejected" ? "Listing has been rejected" : "More documents requested" });
    setSelectedListing(null);
    fetchData();
  };

  const handleDeleteListing = async (id: string) => {
    await fromTable("petmatch_listings").delete().eq("id", id);
    toast({ title: "Listing removed" });
    fetchData();
  };

  const handleSuspendListing = async (id: string) => {
    await fromTable("petmatch_listings").update({ is_active: false, status: "rejected" }).eq("id", id);
    toast({ title: "Listing suspended" });
    fetchData();
  };

  const handleResolveReport = async (reportId: string, action: string) => {
    await fromTable("petmatch_reports").update({
      status: "resolved",
      admin_notes: action,
      resolved_by: user?.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", reportId);
    toast({ title: "Report resolved" });
    fetchData();
  };

  // Stats
  const stats = {
    total: listings.length,
    pending: listings.filter((l) => l.status === "pending").length,
    approved: listings.filter((l) => l.status === "approved").length,
    rejected: listings.filter((l) => l.status === "rejected").length,
    active: listings.filter((l) => l.is_active).length,
    withDocs: listings.filter((l) => l.breed_document_url).length,
    openReports: reports.filter((r) => r.status === "pending").length,
    uniqueBreeds: [...new Set(listings.map((l) => l.pet?.breed).filter(Boolean))].length,
    topBreeds: Object.entries(
      listings.reduce((acc, l) => { const b = l.pet?.breed || "Unknown"; acc[b] = (acc[b] || 0) + 1; return acc; }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]).slice(0, 5),
    animalTypes: Object.entries(
      listings.reduce((acc, l) => { const t = l.pet?.animal_type || "other"; acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>)
    ),
  };

  const filteredVerification = listings
    .filter((l) => l.status === verificationFilter)
    .filter((l) => !searchQuery || l.pet?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredListings = listings
    .filter((l) => !searchQuery || l.pet?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.pet?.breed?.toLowerCase().includes(searchQuery.toLowerCase()) || l.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/10 via-primary/5 to-accent/10 border border-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-primary">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold">PetMatch Management</h2>
            <p className="text-xs text-muted-foreground">Verification, moderation & analytics</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-amber-500" },
          { label: "Approved", value: stats.approved, color: "text-green-500" },
          { label: "Reports", value: stats.openReports, color: stats.openReports > 0 ? "text-destructive" : "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-2.5 text-center">
            <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">
        {([
          { key: "verification" as const, label: "Verify", icon: <ShieldCheck className="h-3 w-3" /> },
          { key: "listings" as const, label: "Listings", icon: <PawPrint className="h-3 w-3" /> },
          { key: "reports" as const, label: "Reports", icon: <Flag className="h-3 w-3" />, badge: stats.openReports },
          { key: "analytics" as const, label: "Analytics", icon: <BarChart3 className="h-3 w-3" /> },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold transition-all relative ${
              tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span className="absolute -top-1 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground px-0.5">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Search */}
      {(tab === "verification" || tab === "listings") && (
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pets, owners, breeds..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

      {/* ─── VERIFICATION TAB ──────────────────────────────────────────────── */}
      {tab === "verification" && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(["pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setVerificationFilter(f)}
                className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold transition-colors ${
                  verificationFilter === f
                    ? f === "pending" ? "bg-amber-500/10 text-amber-600" : f === "approved" ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                    : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                {f === "pending" ? `⏳ Pending (${stats.pending})` : f === "approved" ? `✅ Verified (${stats.approved})` : `❌ Rejected (${stats.rejected})`}
              </button>
            ))}
          </div>

          {filteredVerification.length === 0 ? (
            <div className="text-center py-10">
              <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No {verificationFilter} verifications</p>
            </div>
          ) : (
            filteredVerification.map((listing) => (
              <div key={listing.id} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 rounded-lg">
                    <AvatarImage src={listing.pet?.photo_url || undefined} className="object-cover" />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">{listing.pet?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{listing.pet?.name}</p>
                      {listing.status === "approved" && <BadgeCheck className="h-3.5 w-3.5 text-accent shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{listing.pet?.breed} · {listing.pet?.gender} · {listing.pet?.age}</p>
                    <p className="text-[10px] text-muted-foreground">Owner: {listing.profile?.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {listing.breed_document_url ? (
                        <span className="text-[9px] font-bold bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">📄 Doc Uploaded</span>
                      ) : (
                        <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">⚠ No Docs</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedListing(listing)}
                    className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Eye className="h-3 w-3 inline mr-0.5" /> Review
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── LISTINGS TAB ──────────────────────────────────────────────────── */}
      {tab === "listings" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""} total
          </p>
          {filteredListings.map((listing) => {
            const trust = getBreederTrustScore(listing);
            return (
              <div key={listing.id} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={listing.pet?.photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{listing.pet?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold truncate">{listing.pet?.name}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                        listing.status === "approved" ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
                        listing.status === "pending" ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
                        "bg-destructive/10 text-destructive"
                      }`}>{listing.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{listing.pet?.breed} · {listing.profile?.full_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{trust.score.toFixed(1)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedListing(listing)} className="rounded-full p-1.5 hover:bg-secondary text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleSuspendListing(listing.id)} className="rounded-full p-1.5 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600">
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteListing(listing.id)} className="rounded-full p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── REPORTS TAB ───────────────────────────────────────────────────── */}
      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-10">
              <Flag className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No reports</p>
              <p className="text-xs text-muted-foreground">The community is safe! 🎉</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className={`rounded-xl border p-3 ${report.status === "pending" ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"}`}>
                <div className="flex items-start gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${report.status === "pending" ? "bg-destructive/10" : "bg-muted"}`}>
                    <Flag className={`h-4 w-4 ${report.status === "pending" ? "text-destructive" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold">Report on: {report.listing?.pet?.name || "Unknown"}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                        report.status === "pending" ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      }`}>{report.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">By: {report.reporter?.full_name || "Anonymous"}</p>
                    <p className="text-[10px] font-medium mt-1"><span className="font-semibold">Reason:</span> {report.reason}</p>
                    {report.description && <p className="text-[10px] text-muted-foreground mt-0.5">{report.description}</p>}
                    <p className="text-[9px] text-muted-foreground mt-1">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {report.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleResolveReport(report.id, "Warned user")} className="flex-1 rounded-lg bg-amber-500/10 py-1.5 text-[10px] font-bold text-amber-600">
                      ⚠ Warn
                    </button>
                    <button onClick={() => { handleSuspendListing(report.listing_id); handleResolveReport(report.id, "Listing suspended"); }} className="flex-1 rounded-lg bg-destructive/10 py-1.5 text-[10px] font-bold text-destructive">
                      🚫 Suspend
                    </button>
                    <button onClick={() => handleResolveReport(report.id, "No action needed")} className="flex-1 rounded-lg bg-green-500/10 py-1.5 text-[10px] font-bold text-green-600">
                      ✓ Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── ANALYTICS TAB ─────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-3">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Verified Pets", value: stats.approved, icon: BadgeCheck, color: "text-green-500", bg: "bg-green-500/10" },
              { label: "Active Listings", value: stats.active, icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10" },
              { label: "Unique Breeds", value: stats.uniqueBreeds, icon: PawPrint, color: "text-primary", bg: "bg-primary/10" },
              { label: "With Documents", value: stats.withDocs, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${s.bg}`}>
                    <s.icon className={`h-3 w-3 ${s.color}`} />
                  </div>
                </div>
                <p className="text-lg font-extrabold">{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Top breeds */}
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-bold mb-3">🏆 Top Breeds</p>
            <div className="space-y-2">
              {stats.topBreeds.map(([breed, count], i) => (
                <div key={breed} className="flex items-center gap-2">
                  <span className="text-xs font-bold w-5 text-muted-foreground">{i + 1}.</span>
                  <span className="text-xs font-semibold flex-1">{breed}</span>
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(count / (stats.topBreeds[0]?.[1] || 1)) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-bold w-6 text-right">{count}</span>
                </div>
              ))}
              {stats.topBreeds.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
            </div>
          </div>

          {/* Animal types */}
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-bold mb-3">🐾 By Animal Type</p>
            <div className="flex flex-wrap gap-2">
              {stats.animalTypes.map(([type, count]) => (
                <div key={type} className="rounded-full bg-secondary px-3 py-1.5 text-[10px] font-semibold">
                  {type === "dog" ? "🐕" : type === "cat" ? "🐈" : type === "bird" ? "🐦" : type === "rabbit" ? "🐇" : "🐾"} {type}: {count}
                </div>
              ))}
            </div>
          </div>

          {/* Monetization section */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-primary/5 border border-amber-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-bold">Monetization (Coming Soon)</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Boost PetMatch Profile", desc: "Premium visibility for pet listings", enabled: false },
                { label: "Featured Pets", desc: "Highlighted spots on browse page", enabled: false },
                { label: "Priority Placement", desc: "Appear first in match results", enabled: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-card/60 px-3 py-2.5">
                  <div>
                    <p className="text-[11px] font-semibold">{item.label}</p>
                    <p className="text-[9px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${item.enabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {item.enabled ? "Active" : "Planned"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verification detail modal */}
      {selectedListing && (
        <VerificationDetail
          listing={selectedListing}
          onAction={handleVerificationAction}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  );
};

export default PetMatchManagementPanel;
