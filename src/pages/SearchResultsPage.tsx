import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Star, Heart, UserPlus } from "lucide-react";

type TabType = "users" | "places" | "posts";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const tab = (searchParams.get("tab") as TabType) || "users";

  const [activeTab, setActiveTab] = useState<TabType>(tab);
  const [users, setUsers] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      const q = query.toLowerCase().replace(/^@/, "");

      const [usersRes, placesRes, postsRes] = await Promise.all([
        supabase.from("profiles").select("*").or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(50),
        supabase.from("places").select("*").ilike("name", `%${q}%`).limit(50),
        supabase.from("posts").select("*").ilike("caption", `%${q}%`).limit(50),
      ]);

      // Filter out users who have show_in_search disabled
      let filteredUsers = usersRes.data || [];
      if (filteredUsers.length > 0) {
        const userIds = filteredUsers.map(u => u.user_id);
        const { data: settingsData } = await supabase
          .from("user_settings")
          .select("user_id, show_in_search")
          .in("user_id", userIds)
          .eq("show_in_search", false);
        
        const hiddenIds = new Set((settingsData || []).map(s => s.user_id));
        filteredUsers = filteredUsers.filter(u => !hiddenIds.has(u.user_id));
      }

      setUsers(filteredUsers);
      setPlaces(placesRes.data || []);
      setPosts(postsRes.data || []);
      setLoading(false);
    };
    if (query) search();
  }, [query]);

  const navigateToUser = (u: any) => {
    navigate(`/user/${u.username || u.user_id}`);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg min-h-screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-secondary">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-lg font-bold">Results for "{query}"</h1>
          </div>

          <div className="flex gap-2 mt-3">
            {(["users", "places", "posts"] as TabType[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  activeTab === t
                    ? "petkeep-gradient text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {t} ({t === "users" ? users.length : t === "places" ? places.length : posts.length})
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {activeTab === "users" && (
                <div className="space-y-2">
                  {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No users found</p>}
                  {users.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => navigateToUser(u)}
                      className="flex w-full items-center gap-3 rounded-xl p-3 hover:bg-secondary/50 transition-colors text-left"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-lg font-bold text-primary-foreground">
                          {(u.full_name || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{u.full_name || "User"}</p>
                        <p className="text-xs text-muted-foreground">@{u.username || u.user_id.slice(0, 8)}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "places" && (
                <div className="space-y-2">
                  {places.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No places found</p>}
                  {places.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/place/${p.id}`)}
                      className="flex w-full items-center gap-3 rounded-xl p-3 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-xl">
                        {p.category === "vet" ? "🏥" : p.category === "pet-shop" ? "🐾" : p.category === "park" ? "🌳" : p.category === "cafe" ? "☕" : "📍"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.category.replace("-", " ")}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-petkeep-orange text-petkeep-orange" />
                        {p.rating || 0}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "posts" && (
                <div className="grid grid-cols-3 gap-1">
                  {posts.length === 0 && (
                    <p className="col-span-3 text-sm text-muted-foreground text-center py-8">No posts found</p>
                  )}
                  {posts.map((p) => (
                    <button
                      key={p.id}
                      className="aspect-square bg-secondary rounded-md overflow-hidden"
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground p-2">
                          {p.caption?.slice(0, 40) || "Post"}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default SearchResultsPage;
