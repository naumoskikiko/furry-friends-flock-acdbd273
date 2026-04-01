import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ProviderDetail from "@/components/care/ProviderDetail";
import { supabase } from "@/integrations/supabase/client";
import type { CareProvider } from "@/hooks/useCare";

const ProviderPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<CareProvider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("care_providers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (data) {
        // Fetch profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, username")
          .eq("user_id", data.user_id)
          .maybeSingle();
        setProvider({ ...data, profile } as CareProvider);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!provider) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <span className="text-4xl mb-2">🐾</span>
          <p className="text-sm font-semibold">Profile not available</p>
          <button onClick={() => navigate("/care")} className="text-xs text-primary mt-2 font-bold">
            Back to Care
          </button>
        </div>
      </AppLayout>
    );
  }

  return <ProviderDetail provider={provider} onClose={() => navigate(-1)} />;
};

export default ProviderPage;
