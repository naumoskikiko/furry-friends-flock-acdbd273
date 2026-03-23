import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, UserPlus, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSuggestedUsers } from "@/hooks/useSuggestedUsers";
import { Skeleton } from "@/components/ui/skeleton";

const PeopleYouMayKnow = () => {
  const navigate = useNavigate();
  const { users, loading, fetchSuggestions, followUser } = useSuggestedUsers();

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  if (!loading && users.length === 0) return null;

  return (
    <div className="mx-4 my-3 rounded-2xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">People You May Know</span>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))
          : users.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3">
                <Avatar
                  className="h-10 w-10 cursor-pointer"
                  onClick={() => navigate(`/user/${u.user_id}`)}
                >
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                    {(u.full_name || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => navigate(`/user/${u.user_id}`)}
                >
                  <p className="truncate text-sm font-semibold text-foreground">
                    {u.full_name || "User"}
                  </p>
                  {u.mutual_count > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      {u.mutual_count} mutual connection{u.mutual_count > 1 ? "s" : ""}
                    </p>
                  ) : u.username ? (
                    <p className="text-[11px] text-muted-foreground">@{u.username}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">New user</p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => followUser(u.user_id)}
                  className="h-8 gap-1 rounded-full px-3 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Follow
                </Button>
              </div>
            ))}
      </div>
    </div>
  );
};

export default PeopleYouMayKnow;
