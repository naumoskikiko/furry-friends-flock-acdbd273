import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TaggedUser {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
}

interface PostTagsOverlayProps {
  postId: string;
  visible: boolean;
}

const PostTagsOverlay = ({ postId, visible }: PostTagsOverlayProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tags, setTags] = useState<TaggedUser[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("post_tags")
        .select("id, tagged_user_id")
        .eq("post_id", postId)
        .eq("status", "approved");

      if (!data || data.length === 0) { setTags([]); return; }

      const userIds = data.map((t: any) => t.tagged_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", userIds);

      const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setTags(data.map((t: any) => ({
        id: t.id,
        user_id: t.tagged_user_id,
        username: pMap.get(t.tagged_user_id)?.username || "user",
        full_name: pMap.get(t.tagged_user_id)?.full_name || "User",
      })));
    };
    fetch();
  }, [postId]);

  if (tags.length === 0) return null;

  return (
    <>
      {/* Tap indicator icon (always visible) */}
      {!visible && (
        <div className="absolute bottom-3 left-3 rounded-full bg-foreground/60 px-2 py-0.5 text-[10px] font-medium text-background flex items-center gap-1">
          👤 {tags.length}
        </div>
      )}

      {/* Full overlay with tags */}
      {visible && (
        <div className="absolute inset-0 bg-black/20 flex flex-wrap items-end gap-1.5 p-3 pointer-events-auto">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={(e) => {
                e.stopPropagation();
                if (user?.id === tag.user_id) {
                  navigate("/profile");
                } else {
                  navigate(`/user/${tag.user_id}`);
                }
              }}
              className="rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors"
            >
              @{tag.username}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default PostTagsOverlay;
