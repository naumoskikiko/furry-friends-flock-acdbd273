import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fromTable = (table: string) => (supabase as any).from(table);

export interface ProviderVerification {
  id: string;
  provider_id: string;
  verification_type: string;
  document_url: string;
  document_name: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

export const VERIFICATION_TYPES = [
  { value: "license", label: "License / Certificate", icon: "📜" },
  { value: "clinic_docs", label: "Clinic Documents", icon: "🏥" },
  { value: "id_verification", label: "ID Verification", icon: "🪪" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "degree", label: "Degree / Diploma", icon: "🎓" },
];

export function useProviderVerifications(providerId: string | null) {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState<ProviderVerification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVerifications = useCallback(async () => {
    if (!providerId) { setVerifications([]); setLoading(false); return; }
    const { data } = await fromTable("provider_verifications")
      .select("*")
      .eq("provider_id", providerId)
      .order("submitted_at", { ascending: false });
    setVerifications((data || []) as ProviderVerification[]);
    setLoading(false);
  }, [providerId]);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const submitVerification = useCallback(async (
    type: string,
    file: File
  ) => {
    if (!user || !providerId) return null;

    // Upload to storage
    const filePath = `${user.id}/${providerId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("verification-docs")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get signed URL (private bucket)
    const { data: urlData } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    const docUrl = urlData?.signedUrl || filePath;

    // Insert verification record
    const { data, error } = await fromTable("provider_verifications").insert({
      provider_id: providerId,
      verification_type: type,
      document_url: docUrl,
      document_name: file.name,
    }).select("*").single();

    if (error) throw error;
    await fetchVerifications();
    return data;
  }, [user, providerId, fetchVerifications]);

  const deleteVerification = useCallback(async (id: string) => {
    await fromTable("provider_verifications").delete().eq("id", id);
    fetchVerifications();
  }, [fetchVerifications]);

  const isFullyVerified = verifications.length >= 2 && 
    verifications.every(v => v.status === "approved");

  const pendingCount = verifications.filter(v => v.status === "pending").length;
  const approvedCount = verifications.filter(v => v.status === "approved").length;
  const rejectedCount = verifications.filter(v => v.status === "rejected").length;

  return {
    verifications,
    loading,
    submitVerification,
    deleteVerification,
    isFullyVerified,
    pendingCount,
    approvedCount,
    rejectedCount,
    refresh: fetchVerifications,
  };
}
