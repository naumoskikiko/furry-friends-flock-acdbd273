import { useState } from "react";
import { Heart, MessageCircle, Trash2, Send, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  user_id: string;
  caption: string;
  image_url: string | null;
  location: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  pet_id: string | null;
}

interface PostGridProps {
  posts: Post[];
  onRefresh: () => void;
}

const PostGrid = ({ posts, onRefresh }: PostGridProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const openPost = async (post: Post) => {
    setSelectedPost(post);
    if (user) {
      const { data } = await supabase.from("post_likes").select("id").eq("post_id", post.id).eq("user_id", user.id);
      setLikes(prev => ({ ...prev, [post.id]: (data?.length || 0) > 0 }));
    }
    loadComments(post.id);
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(true);
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    setComments(data || []);
    setLoadingComments(false);
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    const isLiked = likes[post.id];
    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      await supabase.from("posts").update({ likes_count: Math.max(0, post.likes_count - 1) }).eq("id", post.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      await supabase.from("posts").update({ likes_count: post.likes_count + 1 }).eq("id", post.id);
    }
    setLikes(prev => ({ ...prev, [post.id]: !isLiked }));
    onRefresh();
  };

  const addComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) return;
    await supabase.from("post_comments").insert({ post_id: selectedPost.id, user_id: user.id, content: newComment.trim() });
    await supabase.from("posts").update({ comments_count: selectedPost.comments_count + 1 }).eq("id", selectedPost.id);
    setNewComment("");
    loadComments(selectedPost.id);
    onRefresh();
  };

  const deletePost = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    setSelectedPost(null);
    onRefresh();
    toast({ title: "Post deleted" });
  };

  const sharePost = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast({ title: "Link copied!" });
  };

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl">📸</span>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">No posts yet</p>
        <p className="text-xs text-muted-foreground">Share your first moment!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => (
          <button key={post.id} onClick={() => openPost(post)} className="aspect-square overflow-hidden bg-secondary">
            {post.image_url ? (
              <img src={post.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary p-2">
                <p className="text-xs text-muted-foreground line-clamp-3">{post.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(v) => { if (!v) setSelectedPost(null); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selectedPost && (
            <div>
              {selectedPost.image_url && (
                <img src={selectedPost.image_url} alt="" className="w-full aspect-square object-cover" />
              )}
              <div className="p-4">
                {/* Actions */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleLike(selectedPost)} className="transition-transform active:scale-90">
                      <Heart className={`h-6 w-6 ${likes[selectedPost.id] ? "fill-primary text-primary" : "text-foreground"}`} />
                    </button>
                    <MessageCircle className="h-6 w-6 text-foreground" />
                    <button onClick={() => sharePost(selectedPost.id)}>
                      <Send className="h-5 w-5 text-foreground" />
                    </button>
                  </div>
                  {user?.id === selectedPost.user_id && (
                    <button onClick={() => deletePost(selectedPost.id)} className="text-destructive">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <p className="text-sm font-bold">{selectedPost.likes_count} likes</p>
                {selectedPost.caption && <p className="mt-1 text-sm">{selectedPost.caption}</p>}
                {selectedPost.location && <p className="mt-1 text-xs text-muted-foreground">📍 {selectedPost.location}</p>}

                {/* Comments */}
                <div className="mt-3 max-h-32 space-y-2 overflow-y-auto">
                  {comments.map(c => (
                    <p key={c.id} className="text-xs">
                      <span className="font-bold">User</span> {c.content}
                    </p>
                  ))}
                </div>

                {/* Add comment */}
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && addComment()}
                  />
                  <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>Post</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostGrid;
