import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Star, Trash2, Ban, Eye, ChevronDown, ChevronUp,
  AlertTriangle, RotateCcw, Search, Users, CheckCircle2, XCircle,
  MessageSquare, BarChart3, Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { CATEGORIES } from "@/hooks/useCare";

const fromTable = (table: string) => (supabase as any).from(table);

interface ManagedProvider {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  is_verified: boolean;
  is_suspended: boolean;
  is_banned: boolean;
  avg_rating: number;
  total_reviews: number;
  total_bookings: number;
  created_at: string;
  photo_url: string | null;
  admin_notes: string | null;
  profile?: { full_name: string; avatar_url: string | null };
  // computed
  completed_bookings?: number;
  cancelled_bookings?: number;
  total_earnings?: number;
  reports_count?: number;
}

interface ProviderReport {
  id: string;
  provider_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  reporter_name?: string;
}

interface ProviderReview {
  id: string;
  provider_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: { full_name: string; avatar_url: string | null };
}

type DetailTab = "overview" | "reviews" | "reports" | "verification";

const CareManagementPanel = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<ManagedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "banned">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [reports, setReports] = useState<ProviderReport[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [ratingOverride, setRatingOverride] = useState<Record<string, string>>({});

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const { data } = await fromTable("care_providers")
      .select("id, user_id, business_name, category, is_verified, is_suspended, is_banned, avg_rating, total_reviews, total_bookings, created_at, photo_url, admin_notes")
      .order("created_at", { ascending: false });

    const list = (data || []) as ManagedProvider[];

    if (list.length > 0) {
      // Enrich with profiles
      const userIds = [...new Set(list.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Get booking stats per provider
      const providerIds = list.map(p => p.id);
      const { data: bookings } = await fromTable("care_bookings")
        .select("provider_id, status")
        .in("provider_id", providerIds);

      const bookingStats = new Map<string, { completed: number; cancelled: number }>();
      (bookings || []).forEach((b: any) => {
        const s = bookingStats.get(b.provider_id) || { completed: 0, cancelled: 0 };
        if (b.status === "completed") s.completed++;
        if (b.status === "cancelled") s.cancelled++;
        bookingStats.set(b.provider_id, s);
      });

      // Get earnings per provider
      const { data: payments } = await fromTable("care_payments")
        .select("provider_id, total_amount")
        .in("provider_id", providerIds)
        .eq("status", "completed");

      const earningsMap = new Map<string, number>();
      (payments || []).forEach((p: any) => {
        earningsMap.set(p.provider_id, (earningsMap.get(p.provider_id) || 0) + Number(p.total_amount));
      });

      // Get report counts
      const { data: reportCounts } = await fromTable("provider_reports")
        .select("provider_id")
        .in("provider_id", providerIds)
        .eq("status", "pending");

      const reportMap = new Map<string, number>();
      (reportCounts || []).forEach((r: any) => {
        reportMap.set(r.provider_id, (reportMap.get(r.provider_id) || 0) + 1);
      });

      list.forEach(p => {
        p.profile = profMap.get(p.user_id) as any;
        const stats = bookingStats.get(p.id);
        p.completed_bookings = stats?.completed || 0;
        p.cancelled_bookings = stats?.cancelled || 0;
        p.total_earnings = earningsMap.get(p.id) || 0;
        p.reports_count = reportMap.get(p.id) || 0;
      });
    }

    setProviders(list);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const fetchReviews = async (providerId: string) => {
    const { data } = await fromTable("care_reviews")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    const reviewList = (data || []) as ProviderReview[];
    if (reviewList.length > 0) {
      const userIds = [...new Set(reviewList.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      reviewList.forEach(r => { r.profile = profMap.get(r.user_id) as any; });
    }
    setReviews(reviewList);
  };

  const fetchReports = async (providerId: string) => {
    const { data } = await fromTable("provider_reports")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    const reportList = (data || []) as ProviderReport[];
    if (reportList.length > 0) {
      const reporterIds = [...new Set(reportList.map(r => r.reporter_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", reporterIds);
      const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      reportList.forEach(r => { r.reporter_name = (profMap.get(r.reporter_id) as any)?.full_name || "Unknown"; });
    }
    setReports(reportList);
  };

  const handleExpand = async (providerId: string) => {
    if (expandedId === providerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(providerId);
    setDetailTab("overview");
    fetchReviews(providerId);
    fetchReports(providerId);
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    await fromTable("care_providers").update({
      is_suspended: suspend,
      suspended_at: suspend ? new Date().toISOString() : null,
      admin_notes: adminNotes[id] || null,
    }).eq("id", id);
    toast({ title: suspend ? "Provider suspended" : "Provider reactivated" });
    setConfirmAction(null);
    fetchProviders();
  };

  const handleBan = async (id: string) => {
    await fromTable("care_providers").update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      admin_notes: adminNotes[id] || null,
    }).eq("id", id);
    toast({ title: "Provider banned from Care" });
    setConfirmAction(null);
    fetchProviders();
  };

  const handleRemove = async (id: string) => {
    await fromTable("care_providers").delete().eq("id", id);
    toast({ title: "Provider removed" });
    setConfirmAction(null);
    fetchProviders();
  };

  const handleDeleteReview = async (reviewId: string, providerId: string) => {
    await fromTable("care_reviews").delete().eq("id", reviewId);
    // Recalculate rating
    const { data: remaining } = await fromTable("care_reviews")
      .select("rating")
      .eq("provider_id", providerId);
    const ratings = (remaining || []).map((r: any) => r.rating);
    const newAvg = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
    await fromTable("care_providers").update({
      avg_rating: Number(newAvg.toFixed(2)),
      total_reviews: ratings.length,
    }).eq("id", providerId);
    toast({ title: "Review removed & rating recalculated" });
    fetchReviews(providerId);
    fetchProviders();
  };

  const handleOverrideRating = async (providerId: string) => {
    const val = parseFloat(ratingOverride[providerId] || "0");
    if (isNaN(val) || val < 0 || val > 5) {
      toast({ title: "Invalid rating", description: "Enter a value between 0 and 5", variant: "destructive" });
      return;
    }
    await fromTable("care_providers").update({ avg_rating: val }).eq("id", providerId);
    toast({ title: "Rating updated" });
    setRatingOverride(prev => ({ ...prev, [providerId]: "" }));
    fetchProviders();
  };

  const handleResolveReport = async (reportId: string, resolution: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await fromTable("provider_reports").update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id,
      resolution_notes: resolution,
    }).eq("id", reportId);
    toast({ title: "Report resolved" });
    if (expandedId) fetchReports(expandedId);
  };

  // Filtering
  const filtered = providers.filter(p => {
    if (statusFilter === "active" && (p.is_suspended || p.is_banned)) return false;
    if (statusFilter === "suspended" && !p.is_suspended) return false;
    if (statusFilter === "banned" && !p.is_banned) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.business_name.toLowerCase().includes(q) ||
        p.profile?.full_name?.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
    }
    return true;
  });

  const statusFilters = [
    { key: "all" as const, label: "All" },
    { key: "active" as const, label: "Active" },
    { key: "suspended" as const, label: "Suspended" },
    { key: "banned" as const, label: "Banned" },
  ];

  const getStatusBadge = (p: ManagedProvider) => {
    if (p.is_banned) return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-destructive/10 text-destructive">Banned</span>;
    if (p.is_suspended) return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Suspended</span>;
    return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</span>;
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">Care Management</p>
            <p className="text-xs text-muted-foreground">Manage all care providers, reviews, and reports</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>{providers.length} total</span>
          <span>{providers.filter(p => !p.is_suspended && !p.is_banned).length} active</span>
          <span>{providers.filter(p => p.is_suspended && !p.is_banned).length} suspended</span>
          <span className="text-destructive">{providers.filter(p => p.reports_count && p.reports_count > 0).length} with reports</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search providers..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {statusFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === f.key ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Provider list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground">No providers found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const catInfo = CATEGORIES.find(c => c.value === p.category);
            const isExpanded = expandedId === p.id;

            return (
              <div key={p.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => handleExpand(p.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p.photo_url || p.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                        {catInfo?.icon || "🐾"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold truncate">{p.business_name}</p>
                        {p.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {p.profile?.full_name} · {catInfo?.label || p.category} · ⭐ {Number(p.avg_rating).toFixed(1)} · {p.total_bookings} bookings
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.reports_count && p.reports_count > 0 ? (
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-destructive/10 text-destructive flex items-center gap-0.5">
                          <Flag className="h-2.5 w-2.5" /> {p.reports_count}
                        </span>
                      ) : null}
                      {getStatusBadge(p)}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Detail tabs */}
                    <div className="flex border-b border-border">
                      {(["overview", "reviews", "reports", "verification"] as DetailTab[]).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setDetailTab(tab)}
                          className={`flex-1 py-2 text-[11px] font-bold capitalize ${
                            detailTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Overview tab */}
                      {detailTab === "overview" && (
                        <>
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-secondary p-2.5 text-center">
                              <p className="text-lg font-bold">{p.total_bookings}</p>
                              <p className="text-[9px] text-muted-foreground">Total</p>
                            </div>
                            <div className="rounded-xl bg-secondary p-2.5 text-center">
                              <p className="text-lg font-bold text-green-600">{p.completed_bookings}</p>
                              <p className="text-[9px] text-muted-foreground">Completed</p>
                            </div>
                            <div className="rounded-xl bg-secondary p-2.5 text-center">
                              <p className="text-lg font-bold text-destructive">{p.cancelled_bookings}</p>
                              <p className="text-[9px] text-muted-foreground">Cancelled</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-secondary p-2.5 text-center">
                              <p className="text-lg font-bold">⭐ {Number(p.avg_rating).toFixed(1)}</p>
                              <p className="text-[9px] text-muted-foreground">{p.total_reviews} reviews</p>
                            </div>
                            <div className="rounded-xl bg-secondary p-2.5 text-center">
                              <p className="text-lg font-bold">{p.total_earnings?.toLocaleString()} MKD</p>
                              <p className="text-[9px] text-muted-foreground">Total earnings</p>
                            </div>
                          </div>

                          {/* Rating override */}
                          <div className="rounded-xl bg-secondary/50 p-3">
                            <p className="text-xs font-semibold mb-2">Override Rating</p>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                value={ratingOverride[p.id] || ""}
                                onChange={e => setRatingOverride(prev => ({ ...prev, [p.id]: e.target.value }))}
                                placeholder={Number(p.avg_rating).toFixed(1)}
                                className="flex-1 rounded-lg bg-secondary px-3 py-1.5 text-sm outline-none"
                              />
                              <button
                                onClick={() => handleOverrideRating(p.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground"
                              >
                                Set
                              </button>
                            </div>
                          </div>

                          {/* Admin notes */}
                          <div>
                            <label className="text-xs text-muted-foreground">Admin Notes</label>
                            <textarea
                              value={adminNotes[p.id] ?? p.admin_notes ?? ""}
                              onChange={e => setAdminNotes(prev => ({ ...prev, [p.id]: e.target.value }))}
                              rows={2}
                              placeholder="Internal notes about this provider..."
                              className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none resize-none"
                            />
                          </div>

                          {/* Action buttons */}
                          <div className="space-y-2 pt-2">
                            {!p.is_suspended && !p.is_banned && (
                              <button
                                onClick={() => setConfirmAction({ id: p.id, action: "suspend" })}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 transition-colors"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" /> Suspend Provider
                              </button>
                            )}
                            {p.is_suspended && !p.is_banned && (
                              <button
                                onClick={() => handleSuspend(p.id, false)}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 transition-colors"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Reactivate Provider
                              </button>
                            )}
                            {!p.is_banned && (
                              <button
                                onClick={() => setConfirmAction({ id: p.id, action: "ban" })}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-destructive/10 text-destructive transition-colors"
                              >
                                <Ban className="h-3.5 w-3.5" /> Ban From Care
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmAction({ id: p.id, action: "remove" })}
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-destructive text-destructive-foreground transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove Provider
                            </button>
                          </div>
                        </>
                      )}

                      {/* Reviews tab */}
                      {detailTab === "reviews" && (
                        <div className="space-y-2">
                          {reviews.length === 0 ? (
                            <p className="text-center text-xs text-muted-foreground py-4">No reviews</p>
                          ) : reviews.map(r => (
                            <div key={r.id} className="rounded-xl bg-secondary p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={r.profile?.avatar_url || undefined} />
                                    <AvatarFallback className="bg-card text-[10px] font-bold">
                                      {r.profile?.full_name?.charAt(0) || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-xs font-bold">{r.profile?.full_name || "User"}</p>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} className={`h-2.5 w-2.5 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteReview(r.id, p.id)}
                                  className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                                  title="Remove review"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {r.comment && <p className="mt-1.5 text-[11px] text-muted-foreground">{r.comment}</p>}
                              <p className="mt-1 text-[9px] text-muted-foreground">
                                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          ))}
                          <button
                            onClick={() => { handleOverrideRating(p.id); }}
                            className="w-full rounded-xl border border-dashed border-border py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset Rating (Recalculate)
                          </button>
                        </div>
                      )}

                      {/* Reports tab */}
                      {detailTab === "reports" && (
                        <div className="space-y-2">
                          {reports.length === 0 ? (
                            <p className="text-center text-xs text-muted-foreground py-4">No reports</p>
                          ) : reports.map(r => (
                            <div key={r.id} className="rounded-xl bg-secondary p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-bold capitalize">{r.reason || "No reason"}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    by {r.reporter_name} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  r.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                }`}>
                                  {r.status}
                                </span>
                              </div>
                              {r.description && <p className="mt-1.5 text-[11px] text-muted-foreground">{r.description}</p>}
                              {r.status === "pending" && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleResolveReport(r.id, "Reviewed and resolved")}
                                    className="flex-1 rounded-lg py-1.5 text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  >
                                    Resolve
                                  </button>
                                  <button
                                    onClick={() => handleResolveReport(r.id, "Dismissed")}
                                    className="flex-1 rounded-lg py-1.5 text-[10px] font-bold bg-card text-muted-foreground border border-border"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Verification tab */}
                      {detailTab === "verification" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className={`h-5 w-5 ${p.is_verified ? "text-primary" : "text-muted-foreground"}`} />
                            <div>
                              <p className="text-xs font-bold">{p.is_verified ? "Verified Provider" : "Not Verified"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Go to Care Verification panel for detailed document review
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                await fromTable("care_providers").update({ is_verified: !p.is_verified }).eq("id", p.id);
                                toast({ title: p.is_verified ? "Verification revoked" : "Manually verified" });
                                fetchProviders();
                              }}
                              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${
                                p.is_verified
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              }`}
                            >
                              {p.is_verified ? "Revoke Verification" : "Manually Verify"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 space-y-4">
            <p className="text-sm font-bold">
              {confirmAction.action === "suspend" && "Suspend this provider?"}
              {confirmAction.action === "ban" && "Ban this provider from Care?"}
              {confirmAction.action === "remove" && "Permanently remove this provider?"}
            </p>
            <p className="text-xs text-muted-foreground">
              {confirmAction.action === "suspend" && "The provider will disappear from search and cannot accept bookings. You can reactivate later."}
              {confirmAction.action === "ban" && "The provider will be permanently blocked from the Care section. This cannot be easily undone."}
              {confirmAction.action === "remove" && "This will delete the provider profile entirely. All services and bookings data will be lost."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.action === "suspend") handleSuspend(confirmAction.id, true);
                  if (confirmAction.action === "ban") handleBan(confirmAction.id);
                  if (confirmAction.action === "remove") handleRemove(confirmAction.id);
                }}
                className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-2.5 text-xs font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareManagementPanel;
