import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Medication {
  id: string;
  pet_id: string;
  owner_id: string;
  medication_name: string;
  dosage: string;
  times: string[];
  start_date: string;
  end_date: string | null;
  repeat_type: string;
  repeat_days: number[];
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  owner_id: string;
  scheduled_at: string;
  status: string;
  taken_at: string | null;
  created_at: string;
}

export interface MedicationInput {
  pet_id: string;
  medication_name: string;
  dosage: string;
  times: string[];
  start_date: string;
  end_date?: string | null;
  repeat_type: string;
  repeat_days?: number[];
  notes?: string;
  timezone?: string;
}

export const useMedications = (petId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = (supabase as any).from("pet_medications").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    if (petId) query = query.eq("pet_id", petId);
    const { data } = await query;
    setMedications(data || []);
    setLoading(false);
  }, [user, petId]);

  const fetchLogs = useCallback(async (medicationIds?: string[]) => {
    if (!user) return;
    const ids = medicationIds || medications.map(m => m.id);
    if (ids.length === 0) return;
    const { data } = await (supabase as any)
      .from("medication_logs")
      .select("*")
      .in("medication_id", ids)
      .order("scheduled_at", { ascending: false })
      .limit(200);
    setLogs(data || []);
  }, [user, medications]);

  useEffect(() => { fetchMedications(); }, [fetchMedications]);
  useEffect(() => { if (medications.length > 0) fetchLogs(); }, [medications]);

  const addMedication = useCallback(async (input: MedicationInput) => {
    if (!user) return null;
    const { data, error } = await (supabase as any).from("pet_medications").insert({
      ...input,
      owner_id: user.id,
      repeat_days: input.repeat_days || [],
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).select().single();
    if (error) {
      toast({ title: "Error adding medication", description: error.message, variant: "destructive" });
      return null;
    }
    setMedications(prev => [data, ...prev]);
    toast({ title: "Medication added! 💊" });
    return data;
  }, [user, toast]);

  const updateMedication = useCallback(async (id: string, updates: Partial<MedicationInput & { is_active: boolean }>) => {
    const { error } = await (supabase as any).from("pet_medications").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error updating", description: error.message, variant: "destructive" });
      return false;
    }
    setMedications(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    toast({ title: "Medication updated" });
    return true;
  }, [toast]);

  const deleteMedication = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("pet_medications").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
      return false;
    }
    setMedications(prev => prev.filter(m => m.id !== id));
    toast({ title: "Medication removed" });
    return true;
  }, [toast]);

  const markAsTaken = useCallback(async (medicationId: string, scheduledAt: string) => {
    if (!user) return;
    // Check for existing log
    const existing = logs.find(l => l.medication_id === medicationId && l.scheduled_at === scheduledAt);
    if (existing) {
      await (supabase as any).from("medication_logs").update({ status: "taken", taken_at: new Date().toISOString() }).eq("id", existing.id);
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, status: "taken", taken_at: new Date().toISOString() } : l));
    } else {
      const { data } = await (supabase as any).from("medication_logs").insert({
        medication_id: medicationId,
        owner_id: user.id,
        scheduled_at: scheduledAt,
        status: "taken",
        taken_at: new Date().toISOString(),
      }).select().single();
      if (data) setLogs(prev => [data, ...prev]);
    }
    toast({ title: "Marked as taken ✅" });
  }, [user, logs, toast]);

  const markAsMissed = useCallback(async (medicationId: string, scheduledAt: string) => {
    if (!user) return;
    const existing = logs.find(l => l.medication_id === medicationId && l.scheduled_at === scheduledAt);
    if (existing) {
      await (supabase as any).from("medication_logs").update({ status: "missed" }).eq("id", existing.id);
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, status: "missed" } : l));
    } else {
      const { data } = await (supabase as any).from("medication_logs").insert({
        medication_id: medicationId,
        owner_id: user.id,
        scheduled_at: scheduledAt,
        status: "missed",
      }).select().single();
      if (data) setLogs(prev => [data, ...prev]);
    }
  }, [user, logs]);

  // Get today's schedule for a specific medication
  const getTodaySchedule = useCallback((med: Medication) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    if (med.repeat_type === "specific_days" && med.repeat_days?.length > 0) {
      if (!med.repeat_days.includes(dayOfWeek)) return [];
    }
    if (med.end_date && new Date(med.end_date) < today) return [];
    if (new Date(med.start_date) > today) return [];

    return med.times.map(time => {
      const [h, m] = time.split(":").map(Number);
      const scheduled = new Date(today);
      scheduled.setHours(h, m, 0, 0);
      const scheduledIso = scheduled.toISOString();
      const log = logs.find(l => l.medication_id === med.id && new Date(l.scheduled_at).toDateString() === today.toDateString() && new Date(l.scheduled_at).getHours() === h);
      return {
        time,
        scheduledAt: scheduledIso,
        status: log?.status || (scheduled < new Date() ? "overdue" : "pending"),
        log,
      };
    });
  }, [logs]);

  return {
    medications, logs, loading,
    addMedication, updateMedication, deleteMedication,
    markAsTaken, markAsMissed, getTodaySchedule,
    refresh: fetchMedications,
  };
};
