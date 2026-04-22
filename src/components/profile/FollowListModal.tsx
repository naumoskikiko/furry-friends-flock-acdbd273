import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FollowUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  is_following: boolean;
}

interface FollowListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: "followers" | "following";
}

const FollowListModal = ({ open, onOpenChange, userId, type }: FollowListModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setLoading(true);

      // Get the relevant user IDs
      const column = type === "followers" ? "following_id" : "follower_id";
      const selectCol = type === "followers" ? "follower_id" : "following_id";
      const { data: follows } = await supabase
        .from("followers")
        .select(selectCol)
        .eq(column, userId);

      const userIds = follows?.map((f: any) => f[selectCol]) || [];
      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const [profilesRes, myFollowsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        user
          ? supabase.from("followers").select("following_id").eq("follower_id", user.id).in("following_id", userIds)
          : { data: [] as any[] },
      ]);

      const followingSet = new Set(myFollowsRes.data?.map((f: any) => f.following_id) || []);
      setUsers(
        (profilesRes.data || []).map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          is_following: followingSet.has(p.user_id),
        }))
      );
      setLoading(false);
    };
    fetch();
  }, [open, userId, type, user]);

  const toggleFollow = async (targetId: string, isFollowing: boolean) => {
    if (!user) return;
    if (isFollowing) {
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", targetId);
    } else {
      await supabase.from("followers").insert({ follower_id: user.id, following_id: targetId });
    }
    setUsers((prev) =>
      prev.map((u) => (u.user_id === targetId ? { ...u, is_following: !isFollowing } : u))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden max-h-[70vh]">
        <div className="border-b border-border p-4">
          <h3 className="text-center font-display font-bold capitalize">{type}</h3>
        </div>
        <div className="max-h-[55vh] overflow-y-auto px-4 py-2 space-y-3">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          {!loading && users.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          )}
          {users.map((u) => (
            <div key={u.user_id} className="flex items-center gap-3">
              <button onClick={() => { onOpenChange(false); navigate(user?.id === u.user_id ? "/profile" : `/user/${u.user_id}`); }} className="shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light text-xs font-bold text-primary-foreground">
                    {u.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </button>
              <button onClick={() => { onOpenChange(false); navigate(user?.id === u.user_id ? "/profile" : `/user/${u.user_id}`); }} className="flex-1 text-left text-sm font-semibold truncate">{u.full_name}</button>
              {user && u.user_id !== user.id && (
                <Button
                  size="sm"
                  variant={u.is_following ? "secondary" : "default"}
                  className="h-8 text-xs"
                  onClick={() => toggleFollow(u.user_id, u.is_following)}
                >
                  {u.is_following ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowListModal;
