import { useState, useEffect, useCallback, useMemo } from "react";
import { ShieldCheck, Check, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { VERIFICATION_TYPES } from "@/hooks/useVerification";
import { formatDistanceToNow } from "date-fns";

const fromTable = (table: string) => (supabase as any).from(table);

interface VerificationRequest {
  id: string;
  provider_id: string;
  verification_type: string;
  document_url: string;
  document_name: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  provider?: { business_name: string; category: string; user_id: string };
  profile?: { full_name: string; avatar_url: string | null };
}

interface ProviderGroup {
  provider_id: string;
  provider?: VerificationRequest["provider"];
  profile?: VerificationRequest["profile"];
  items: VerificationRequest[];
  latestSubmittedAt: string;
  overallStatus: "pending" | "approved" | "rejected" | "mixed";
}

const TYPE_STYLES: Record<string, string> = {
  license: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  clinic_docs: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  id_verification: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  insurance: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  degree: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const CareVerificationPanel = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewIsPdf, setViewIsPdf] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    // Always fetch ALL for a provider so we can group; filter is applied per-card via overallStatus
    const { data } = await fromTable("provider_verifications")
      .select("*")
      .order("submitted_at", { ascending: false });

    const list = (data || []) as VerificationRequest[];

    if (list.length > 0) {
      const providerIds = [...new Set(list.map(r => r.provider_id))];
      const { data: providers } = await fromTable("care_providers")
        .select("id, business_name, category, user_id")
        .in("id", providerIds);

      const provMap = new Map((providers || []).map((p: any) => [p.id, p]));
      const userIds = [...new Set((providers || []).map((p: any) => p.user_id))] as string[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      list.forEach(r => {
        r.provider = provMap.get(r.provider_id) as any;
        if (r.provider) {
          r.profile = profMap.get(r.provider.user_id) as any;
        }
      });
    }

    setRequests(list);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Group by provider
  const groups = useMemo<ProviderGroup[]>(() => {
    const map = new Map<string, ProviderGroup>();
    for (const r of requests) {
      const g = map.get(r.provider_id);
      if (g) {
        g.items.push(r);
        if (r.submitted_at > g.latestSubmittedAt) g.latestSubmittedAt = r.submitted_at;
      } else {
        map.set(r.provider_id, {
          provider_id: r.provider_id,
          provider: r.provider,
          profile: r.profile,
          items: [r],
          latestSubmittedAt: r.submitted_at,
          overallStatus: "pending",
        });
      }
    }
    // Compute overallStatus
    const result = Array.from(map.values()).map(g => {
      const statuses = new Set(g.items.map(i => i.status));
      let overall: ProviderGroup["overallStatus"] = "pending";
      if (statuses.size === 1) {
        const only = [...statuses][0] as any;
        overall = only === "approved" ? "approved" : only === "rejected" ? "rejected" : "pending";
      } else {
        overall = "mixed";
      }
      return { ...g, overallStatus: overall };
    });
    // Filter by status chip
    const filtered = result.filter(g => {
      if (filter === "all") return true;
      if (filter === "pending") return g.items.some(i => i.status === "pending");
      if (filter === "approved") return g.overallStatus === "approved";
      if (filter === "rejected") return g.overallStatus === "rejected";
      return true;
    });
    // Sort by latest submission desc
    filtered.sort((a, b) => (a.latestSubmittedAt < b.latestSubmittedAt ? 1 : -1));
    return filtered;
  }, [requests, filter]);

  const openDocument = async (r: VerificationRequest) => {
    const match = r.document_url.match(/\/object\/sign\/verification-docs\/([^?]+)/);
    let url = r.document_url;
    if (match) {
      const path = decodeURIComponent(match[1]);
      const { data } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(path, 60 * 60);
      if (data?.signedUrl) url = data.signedUrl;
    }
    setViewIsPdf((r.document_name || "").toLowerCase().endsWith(".pdf"));
    setViewUrl(url);
  };

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    const notes = reviewNotes[id] || "";
    await fromTable("provider_verifications")
      .update({
        status: action,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes || null,
      })
      .eq("id", id);

    const req = requests.find(r => r.id === id);
    if (req) {
      const { data: allVer } = await fromTable("provider_verifications")
        .select("id, status")
        .eq("provider_id", req.provider_id);

      const approvedCount = (allVer || []).filter((v: any) =>
        v.status === "approved" || (v.id === id && action === "approved")
      ).filter((v: any) => !(v.id === id && action === "rejected")).length;

      await fromTable("care_providers")
        .update({ is_verified: approvedCount >= 2 })
        .eq("id", req.provider_id);
    }

    toast({ title: action === "approved" ? "Verification approved ✅" : "Verification rejected ❌" });
    fetchRequests();
  };

  const filters = [
    { key: "pending" as const, label: "Pending" },
    { key: "approved" as const, label: "Approved" },
    { key: "rejected" as const, label: "Rejected" },
    { key: "all" as const, label: "All" },
  ];

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      <h2 className="font-display text-lg font-bold">🛡️ Care Verification Review</h2>
      <p className="text-xs text-muted-foreground">One card per provider — review all required certificates together</p>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f.key ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold">No {filter !== "all" ? filter : ""} verifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const approvedCount = g.items.filter(i => i.status === "approved").length;
            const pendingCount = g.items.filter(i => i.status === "pending").length;
            const isFullyVerified = approvedCount >= 2 && g.items.every(i => i.status === "approved");

            return (
              <div key={g.provider_id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <div className="p-4">
                  {/* Provider header */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                        {g.profile?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{g.provider?.business_name || "Unknown Provider"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {g.profile?.full_name || "Unknown"} · {g.provider?.category}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${
                      isFullyVerified ? "bg-green-100 text-green-800" :
                      pendingCount > 0 ? "bg-amber-100 text-amber-800" :
                      g.overallStatus === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-secondary text-foreground"
                    }`}>
                      {isFullyVerified ? "verified" : pendingCount > 0 ? `${pendingCount} pending` : g.overallStatus}
                    </span>
                  </div>

                  {/* Progress hint */}
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {approvedCount}/{Math.max(2, g.items.length)} required certificates approved
                  </p>

                  {/* Certificates list */}
                  <div className="mt-3 space-y-2">
                    {g.items.map(r => {
                      const typeInfo = VERIFICATION_TYPES.find(t => t.value === r.verification_type);
                      const typeClass = TYPE_STYLES[r.verification_type] || "bg-secondary text-foreground";

                      return (
                        <div key={r.id} className="rounded-xl border border-border/60 bg-secondary/40 p-3">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${typeClass}`}>
                              {typeInfo?.icon} {typeInfo?.label || r.verification_type}
                            </span>
                            <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${
                              r.status === "pending" ? "bg-amber-100 text-amber-800" :
                              r.status === "approved" ? "bg-green-100 text-green-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {r.status}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-xs text-muted-foreground truncate flex-1">📄 {r.document_name}</p>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDocument(r)}>
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                          </div>

                          <p className="text-[10px] text-muted-foreground mt-1">
                            Submitted {formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })}
                          </p>

                          {r.status === "pending" && (
                            <div className="mt-2 space-y-2">
                              <Input
                                placeholder="Review notes (optional)"
                                value={reviewNotes[r.id] || ""}
                                onChange={e => setReviewNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                                className="h-8 text-xs"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                                  onClick={() => handleAction(r.id, "approved")}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => handleAction(r.id, "rejected")}
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </div>
                            </div>
                          )}

                          {r.reviewer_notes && r.status !== "pending" && (
                            <div className="mt-2 text-[10px] text-muted-foreground">
                              <span className="font-semibold">Notes:</span> {r.reviewer_notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document viewer */}
      <Dialog open={!!viewUrl} onOpenChange={() => setViewUrl(null)}>
        <DialogContent className="max-w-lg p-2">
          {viewUrl && (
            viewIsPdf ? (
              <iframe src={viewUrl} className="w-full h-[70vh] rounded-lg" />
            ) : (
              <img src={viewUrl} alt="Verification document" className="w-full rounded-lg object-contain max-h-[70vh]" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CareVerificationPanel;
