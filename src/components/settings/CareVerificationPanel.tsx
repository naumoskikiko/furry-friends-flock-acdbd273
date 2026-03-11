import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, CheckCircle2, XCircle, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const CareVerificationPanel = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = fromTable("provider_verifications")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    const list = (data || []) as VerificationRequest[];

    // Enrich with provider + profile info
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
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    const notes = reviewNotes[id] || "";
    await fromTable("provider_verifications")
      .update({
        status: action,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes || null,
      })
      .eq("id", id);

    // If approved, check if provider should get verified badge
    const req = requests.find(r => r.id === id);
    if (req) {
      const { data: allVer } = await fromTable("provider_verifications")
        .select("id, status")
        .eq("provider_id", req.provider_id);
      
      const approvedCount = (allVer || []).filter((v: any) => 
        v.status === "approved" || (v.id === id && action === "approved")
      ).filter((v: any) => !(v.id === id && action === "rejected")).length;
      
      // Update provider verified status based on approved count
      await fromTable("care_providers")
        .update({ is_verified: approvedCount >= 2 })
        .eq("id", req.provider_id);
    }

    toast({ title: `Verification ${action}` });
    fetchRequests();
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const filters = [
    { key: "all" as const, label: "All" },
    { key: "pending" as const, label: "Pending" },
    { key: "approved" as const, label: "Approved" },
    { key: "rejected" as const, label: "Rejected" },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">Care Verification</p>
            <p className="text-xs text-muted-foreground">Review and manage provider verification requests</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground">No {filter !== "all" ? filter : ""} verification requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const typeInfo = VERIFICATION_TYPES.find(t => t.value === r.verification_type);
            const isExpanded = expandedId === r.id;

            return (
              <div key={r.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                        {r.profile?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{r.provider?.business_name || "Unknown Provider"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.profile?.full_name} · {typeInfo?.icon} {typeInfo?.label} · {formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[r.status] || "bg-secondary"}`}>
                        {r.status}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3">
                    <div className="rounded-xl bg-secondary p-3">
                      <p className="text-xs font-semibold mb-1">Document</p>
                      <p className="text-xs text-muted-foreground">{r.document_name}</p>
                      <a
                        href={r.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> View Document
                      </a>
                    </div>

                    {r.reviewer_notes && (
                      <div className="rounded-xl bg-secondary p-3">
                        <p className="text-xs font-semibold mb-1">Review Notes</p>
                        <p className="text-xs text-muted-foreground">{r.reviewer_notes}</p>
                      </div>
                    )}

                    {r.status === "pending" && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Notes (optional)</label>
                          <textarea
                            value={reviewNotes[r.id] || ""}
                            onChange={e => setReviewNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                            rows={2}
                            placeholder="Add review notes..."
                            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(r.id, "approved")}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(r.id, "rejected")}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      </>
                    )}

                    {/* Allow changing decisions for approved/rejected */}
                    {r.status === "approved" && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Notes (optional)</label>
                          <textarea
                            value={reviewNotes[r.id] || ""}
                            onChange={e => setReviewNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                            rows={2}
                            placeholder="Reason for revoking..."
                            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none resize-none"
                          />
                        </div>
                        <button
                          onClick={() => handleAction(r.id, "rejected")}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <XCircle className="h-4 w-4" /> Revoke Approval
                        </button>
                      </div>
                    )}

                    {r.status === "rejected" && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Notes (optional)</label>
                          <textarea
                            value={reviewNotes[r.id] || ""}
                            onChange={e => setReviewNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                            rows={2}
                            placeholder="Reason for approving..."
                            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none resize-none"
                          />
                        </div>
                        <button
                          onClick={() => handleAction(r.id, "approved")}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve Instead
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CareVerificationPanel;
