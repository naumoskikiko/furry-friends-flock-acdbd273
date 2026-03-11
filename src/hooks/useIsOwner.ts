import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsOwner() {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsOwner(false);
      setLoading(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "owner" })
      .then(({ data }) => {
        setIsOwner(!!data);
        setLoading(false);
      });
  }, [user]);

  return { isOwner, loading };
}
