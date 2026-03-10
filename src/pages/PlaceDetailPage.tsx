import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Phone, Globe, Clock, Star } from "lucide-react";

const PlaceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from("places").select("*").eq("id", id).single().then(({ data }) => {
      setPlace(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!place) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <span className="text-5xl mb-4">📍</span>
          <h2 className="text-lg font-bold">Place not found</h2>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm font-semibold text-primary">Go back</button>
        </div>
      </AppLayout>
    );
  }

  const categoryEmoji: Record<string, string> = {
    vet: "🏥", "pet-shop": "🐾", park: "🌳", cafe: "☕", grooming: "✂️", "pet-service": "🐕",
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg min-h-screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold truncate">{place.name}</h1>
        </div>

        {place.image_url && (
          <img src={place.image_url} alt={place.name} className="w-full h-48 object-cover" />
        )}

        <div className="px-4 py-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-2xl shrink-0">
              {categoryEmoji[place.category] || "📍"}
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold">{place.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">{place.category.replace("-", " ")}</p>
              {place.rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 fill-petkeep-orange text-petkeep-orange" />
                  <span className="text-sm font-semibold">{place.rating}</span>
                </div>
              )}
            </div>
          </div>

          {place.description && (
            <div>
              <h3 className="text-sm font-bold mb-1">About</h3>
              <p className="text-sm text-muted-foreground">{place.description}</p>
            </div>
          )}

          <div className="space-y-3">
            {place.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{place.address}</span>
              </div>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`} className="flex items-center gap-3 text-sm text-primary">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{place.phone}</span>
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="truncate">{place.website}</span>
              </a>
            )}
            {place.opening_hours && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{place.opening_hours}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PlaceDetailPage;
