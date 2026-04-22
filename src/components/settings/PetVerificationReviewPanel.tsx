import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Check, X, Eye, Loader2, PawPrint, Syringe, Heart, FileText, BookMarked, FileBadge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const fromTable = (table: string) => (supabase as any).from(table);

interface PetVerification {
  id: string;
  pet_id: string;
  owner_id: string;
  verification_type: string;
  document_url: string;
  document_name: string;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  pet?: { name: string; breed: string; animal_type: string; photo_url: string | null };
  owner?: { full_name: string; avatar_url: string | null };
}

const TYPE_META: Record<string, { label: string; icon: JSX.Element; className: string }> = {
  vaccination: { label: "Vaccination", icon: <Syringe className="h-2.5 w-2.5 inline mr-0.5" />, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  neutered: { label: "Neutered/Spayed", icon: <Heart className="h-2.5 w-2.5 inline mr-0.5" />, className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  health_certificate: { label: "Health Certificate", icon: <FileText className="h-2.5 w-2.5 inline mr-0.5" />, className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400" },
  pet_passport: { label: "Pet Passport", icon: <BookMarked className="h-2.5 w-2.5 inline mr-0.5" />, className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  ownership_proof: { label: "Ownership Proof", icon: <FileBadge className="h-2.5 w-2.5 inline mr-0.5" />, className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

const PetVerificationReviewPanel = () => {
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<PetVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [viewImage, setViewImage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    let query = fromTable("pet_verifications").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);

    const { data } = await query;
    if (!data) { setLoading(false); return; }

    const petIds = [...new Set((data as any[]).map((v: any) => v.pet_id))];
    const ownerIds = [...new Set((data as any[]).map((v: any) => v.owner_id))];

    const [{ data: pets }, { data: profiles }] = await Promise.all([
      supabase.from("pets").select("id, name, breed, animal_type, photo_url").in("id", petIds.length ? petIds : [""]),
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ownerIds.length ? ownerIds : [""]),
    ]);

    const petMap = Object.fromEntries((pets || []).map((p: any) => [p.id, p]));
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));

    setVerifications((data as any[]).map((v: any) => ({
      ...v,
      pet: petMap[v.pet_id],
      owner: profileMap[v.owner_id],
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleAction = async (id: string, status: "verified" | "rejected", petId: string, type: string) => {
    const notes = reviewNotes[id] || null;
    const { error } = await fromTable("pet_verifications").update({
      status,
      reviewer_notes: notes,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // If verified, update the pet's vaccinated/neutered field
    if (status === "verified") {
      const updateField = type === "vaccination" ? { vaccinated: true } : { neutered: true };
      await supabase.from("pets").update(updateField).eq("id", petId);
    }

    toast({ title: status === "verified" ? "Verification approved ✅" : "Verification rejected ❌" });
    fetchData();
  };

  const counts = {
    pending: verifications.length, // We only know the filtered count
  };

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      <h2 className="font-display text-lg font-bold">🐾 Pet Verification Review</h2>
      <p className="text-xs text-muted-foreground">Review uploaded vaccination and neutering proof documents</p>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {(["pending", "verified", "rejected", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : verifications.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold">No {filter !== "all" ? filter : ""} verifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {verifications.map(v => (
            <div key={v.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={v.pet?.photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 font-bold">
                      <PawPrint className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">{v.pet?.name || "Unknown Pet"}</p>
                      {(() => {
                        const meta = TYPE_META[v.verification_type] || { label: v.verification_type, icon: <FileText className="h-2.5 w-2.5 inline mr-0.5" />, className: "bg-secondary text-foreground" };
                        return (
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${meta.className}`}>
                            {meta.icon} {meta.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {v.pet?.breed || v.pet?.animal_type} • Owner: {v.owner?.full_name || "Unknown"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${
                    v.status === "pending" ? "bg-amber-100 text-amber-800" :
                    v.status === "verified" ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {v.status}
                  </span>
                </div>

                {/* Document */}
                <div className="mt-3 flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate flex-1">📄 {v.document_name}</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setViewImage(v.document_url)}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground mt-1">
                  Submitted {new Date(v.created_at).toLocaleDateString()}
                </p>

                {/* Review actions */}
                {v.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="Review notes (optional)"
                      value={reviewNotes[v.id] || ""}
                      onChange={e => setReviewNotes(prev => ({ ...prev, [v.id]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(v.id, "verified", v.pet_id, v.verification_type)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleAction(v.id, "rejected", v.pet_id, v.verification_type)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Previous notes */}
                {v.reviewer_notes && v.status !== "pending" && (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    <span className="font-semibold">Notes:</span> {v.reviewer_notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document viewer */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-lg p-2">
          {viewImage && (
            viewImage.endsWith(".pdf") ? (
              <iframe src={viewImage} className="w-full h-[70vh] rounded-lg" />
            ) : (
              <img src={viewImage} alt="Verification document" className="w-full rounded-lg object-contain max-h-[70vh]" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PetVerificationReviewPanel;
