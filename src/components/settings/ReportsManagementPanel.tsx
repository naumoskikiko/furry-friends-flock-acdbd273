import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle, Eye, CheckCircle, XCircle, Trash2, Shield, Ban, ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const fromTable = (table: string) => (supabase as any).from(table);

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  content_id: string | null;
  content_type: string;
  reason: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

const ReportsManagementPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await fromTable("reports")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(100);
    setReports(data || []);

    // Fetch profile names
    if (data && data.length > 0) {
      const ids = [...new Set([
        ...data.map((r: Report) => r.reporter_id),
        ...data.filter((r: Report) => r.reported_user_id).map((r: Report) => r.reported_user_id),
      ])].filter(Boolean) as string[];

      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", ids);
        const map: Record<string, any> = {};
        profs?.forEach((p) => { map[p.user_id] = p; });
        setProfiles((prev) => ({ ...prev, ...map }));
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [tab]);

  const updateReport = async (id: string, status: string, notes?: string) => {
    if (!user) return;
    await fromTable("reports").update({
      status,
      admin_notes: notes || null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    toast({ title: `Report ${status}` });
    fetchReports();
    setExpandedId(null);
    setAdminNotes("");
    setConfirmAction(null);
  };

  const deleteContent = async (report: Report) => {
    // Delete the reported content
    if (report.content_id) {
      if (["article", "question", "meetup"].includes(report.content_type)) {
        // Delete blog post cascade
        await fromTable("blog_event_participants").delete().eq("blog_post_id", report.content_id);
        await fromTable("blog_comments").delete().eq("blog_post_id", report.content_id);
        await fromTable("blog_likes").delete().eq("blog_post_id", report.content_id);
        await fromTable("blog_saves").delete().eq("blog_post_id", report.content_id);
        await fromTable("blog_posts").delete().eq("id", report.content_id);
      } else if (report.content_type === "post") {
        await fromTable("post_comments").delete().eq("post_id", report.content_id);
        await fromTable("post_likes").delete().eq("post_id", report.content_id);
        await supabase.from("posts").delete().eq("id", report.content_id);
      }
    }
    await updateReport(report.id, "resolved", adminNotes || "Content deleted by admin");
    toast({ title: "Content deleted & report resolved" });
  };

  const getName = (userId: string | null) => {
    if (!userId) return "Unknown";
    return profiles[userId]?.full_name || profiles[userId]?.username || userId.slice(0, 8);
  };

  const statusColor = (s: string) => {
    if (s === "pending") return "bg-amber-500/10 text-amber-600";
    if (s === "reviewed") return "bg-blue-500/10 text-blue-600";
    return "bg-green-500/10 text-green-600";
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      <div className="rounded-2xl bg-gradient-to-r from-destructive/10 to-amber-500/10 p-4">
        <p className="text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Reports Management
        </p>
        <p className="text-xs text-muted-foreground mt-1">Review and manage user reports</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">Pending</TabsTrigger>
          <TabsTrigger value="reviewed" className="flex-1">Reviewed</TabsTrigger>
          <TabsTrigger value="resolved" className="flex-1">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No {tab} reports</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[10px] ${statusColor(r.status)}`}>{r.status}</Badge>
                    <span className="text-xs font-semibold">{r.reason}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{r.content_type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Reported by {getName(r.reporter_id)} • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === r.id ? "rotate-180" : ""}`} />
              </button>

              {expandedId === r.id && (
                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                  <div className="space-y-1 text-xs">
                    {r.reported_user_id && (
                      <p><span className="font-semibold">Reported user:</span> {getName(r.reported_user_id)}</p>
                    )}
                    {r.content_id && (
                      <p><span className="font-semibold">Content ID:</span> {r.content_id.slice(0, 8)}...</p>
                    )}
                    {r.description && (
                      <p><span className="font-semibold">Description:</span> {r.description}</p>
                    )}
                    {r.admin_notes && (
                      <p><span className="font-semibold">Admin notes:</span> {r.admin_notes}</p>
                    )}
                  </div>

                  {r.status !== "resolved" && (
                    <>
                      <Textarea
                        placeholder="Admin notes (optional)"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={2}
                        className="resize-none text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateReport(r.id, "reviewed", adminNotes)}>
                          <Eye className="h-3 w-3 mr-1" /> Mark Reviewed
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateReport(r.id, "resolved", adminNotes || "Dismissed")}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Dismiss
                        </Button>
                        {r.content_id && (
                          <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ id: r.id, action: "delete" })}>
                            <Trash2 className="h-3 w-3 mr-1" /> Delete Content
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reported content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the reported content and resolve the report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                const report = reports.find((r) => r.id === confirmAction?.id);
                if (report) deleteContent(report);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportsManagementPanel;
