import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FindMyPetAccess {
  trackingEnabled: boolean;
  chipEnabled: boolean;
  trackingUntil: string | null;
  chipUntil: string | null;
  reason: string | null;
}

const DEFAULT_ACCESS: FindMyPetAccess = {
  trackingEnabled: false,
  chipEnabled: false,
  trackingUntil: null,
  chipUntil: null,
  reason: null,
};

function isActive(enabled: boolean, until: string | null) {
  if (!enabled) return false;
  if (!until) return true;
  return new Date(until).getTime() > Date.now();
}

export function useFindMyPetAccess() {
  const { user } = useAuth();
  const [access, setAccess] = useState<FindMyPetAccess>(DEFAULT_ACCESS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAccess(DEFAULT_ACCESS);
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("find_my_pet_access")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setAccess({
          trackingEnabled: !!data.tracking_enabled,
          chipEnabled: !!data.chip_enabled,
          trackingUntil: data.tracking_enabled_until,
          chipUntil: data.chip_enabled_until,
          reason: data.last_reason,
        });
      } else {
        setAccess(DEFAULT_ACCESS);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`findmypet-access-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "find_my_pet_access",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;
          if (payload.eventType === "DELETE") {
            setAccess(DEFAULT_ACCESS);
          } else {
            setAccess({
              trackingEnabled: !!row.tracking_enabled,
              chipEnabled: !!row.chip_enabled,
              trackingUntil: row.tracking_enabled_until,
              chipUntil: row.chip_enabled_until,
              reason: row.last_reason,
            });
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    loading,
    access,
    canTrack: isActive(access.trackingEnabled, access.trackingUntil),
    canUseChip: isActive(access.chipEnabled, access.chipUntil),
  };
}
