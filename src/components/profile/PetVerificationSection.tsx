import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, ShieldCheck, Clock, XCircle, Loader2, Trash2, Syringe, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const fromTable = (table: string) => (supabase as any).from(table);

interface Verification {
  id: string;
  pet_id: string;
  verification_type: string;
  document_url: string;
  document_name: string;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
}

interface PetVerificationSectionProps {
  petId: string;
  onStatusChange?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: {
    label: "Pending verification ⏳",
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  verified: {
    label: "Verified ✅",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Rejected ❌",
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const PetVerificationSection = ({ petId, onStatusChange }: PetVerificationSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVerifications = async () => {
    const { data } = await fromTable("pet_verifications")
      .select("*")
      .eq("pet_id", petId)
      .order("created_at", { ascending: false });
    setVerifications((data || []) as Verification[]);
    setLoading(false);
  };

  useEffect(() => {
    if (petId) fetchVerifications();
  }, [petId]);

  const getVerification = (type: string) => {
    return verifications.find(v => v.verification_type === type);
  };

  const handleUpload = async (type: string, file: File) => {
    if (!user) return;
    setUploading(type);

    const filePath = `${user.id}/${petId}/${type}_${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("pet-verification-docs")
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(null);
      return;
    }

    // Get signed URL for admin viewing
    const { data: urlData } = await supabase.storage
      .from("pet-verification-docs")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    // Delete any existing pending/rejected verification for this type
    const existing = getVerification(type);
    if (existing && existing.status !== "verified") {
      await fromTable("pet_verifications").delete().eq("id", existing.id);
    }

    // Insert new verification request
    const { error: insertErr } = await fromTable("pet_verifications").insert({
      pet_id: petId,
      owner_id: user.id,
      verification_type: type,
      document_url: urlData?.signedUrl || filePath,
      document_name: file.name,
      status: "pending",
    });

    if (insertErr) {
      toast({ title: "Error", description: insertErr.message, variant: "destructive" });
    } else {
      toast({ title: "Document submitted for review!" });
      onStatusChange?.();
    }

    setUploading(null);
    fetchVerifications();
  };

  const handleDelete = async (id: string) => {
    await fromTable("pet_verifications").delete().eq("id", id);
    toast({ title: "Verification removed" });
    fetchVerifications();
    onStatusChange?.();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const types = [
    { key: "vaccination", label: "Vaccination Proof", icon: <Syringe className="h-4 w-4" />, desc: "Upload vet certificate or vaccination card" },
    { key: "neutered", label: "Neutered / Spayed Proof", icon: <Heart className="h-4 w-4" />, desc: "Upload surgery certificate or vet confirmation" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Verification Documents</p>
      {types.map(({ key, label, icon, desc }) => {
        const v = getVerification(key);
        const status = v?.status || "not_submitted";
        const config = STATUS_CONFIG[status];

        return (
          <div key={key} className="rounded-xl bg-secondary/40 border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm font-semibold">{label}</span>
              </div>
              {config && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${config.className}`}>
                  {config.icon} {config.label}
                </span>
              )}
              {!v && (
                <span className="text-[10px] font-semibold text-muted-foreground">Not submitted</span>
              )}
            </div>

            {/* Rejection notes */}
            {v?.status === "rejected" && v.reviewer_notes && (
              <div className="mt-2 rounded-lg bg-destructive/5 border border-destructive/20 p-2">
                <p className="text-[10px] text-destructive font-semibold">Reason: {v.reviewer_notes}</p>
              </div>
            )}

            {/* Document preview */}
            {v?.document_url && v.status !== "rejected" && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span className="truncate flex-1">{v.document_name}</span>
                {v.status === "pending" && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive text-[10px]" onClick={() => handleDelete(v.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            {/* Upload button - show when not verified */}
            {(!v || v.status === "rejected") && (
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground mb-1.5">{desc}</p>
                <label className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                  uploading === key ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
                }`}>
                  {uploading === key ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="h-3 w-3" /> Upload Proof</>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={uploading === key}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(key, f);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PetVerificationSection;
