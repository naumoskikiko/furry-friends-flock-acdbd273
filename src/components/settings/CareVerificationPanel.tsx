import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Check, X, Eye, FileText } from "lucide-react";
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
    let query = fromTable("provider_verifications")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
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
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

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
      <p className="text-xs text-muted-foreground">Review uploaded provider verification documents</p>

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
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold">No {filter !== "all" ? filter : ""} verifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const typeInfo = VERIFICATION_TYPES.find(t => t.value === r.verification_type);
            const typeClass = TYPE_STYLES[r.verification_type] || "bg-secondary text-foreground";

            return (
              <div key={r.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                        {r.profile?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{r.provider?.business_name || "Unknown Provider"}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${typeClass}`}>
                          {typeInfo?.icon} {typeInfo?.label || r.verification_type}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {r.profile?.full_name || "Unknown"} · {r.provider?.category}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${
                      r.status === "pending" ? "bg-amber-100 text-amber-800" :
                      r.status === "approved" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  {/* Document */}
                  <div className="mt-3 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate flex-1">📄 {r.document_name}</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDocument(r)}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-1">
                    Submitted {formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })}
                  </p>

                  {/* Review actions */}
                  {r.status === "pending" && (
                    <div className="mt-3 space-y-2">
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

                  {/* Previous notes */}
                  {r.reviewer_notes && r.status !== "pending" && (
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      <span className="font-semibold">Notes:</span> {r.reviewer_notes}
                    </div>
                  )}
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
