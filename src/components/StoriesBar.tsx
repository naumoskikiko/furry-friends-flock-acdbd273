import { useState } from "react";
import { Plus } from "lucide-react";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateConversation } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import StoryViewer from "@/components/stories/StoryViewer";
import CreateStoryModal from "@/components/stories/CreateStoryModal";
import ShareStoryModal from "@/components/stories/ShareStoryModal";
import { useToast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

const StoriesBar = () => {
  const { user, profile } = useAuth();
  const { storyGroups, hasOwnStory, refreshStories, likeStory, unlikeStory, recordView } = useStories();
  const { toast } = useToast();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareModal, setShareModal] = useState<{ storyId: string; mediaUrl: string } | null>(null);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "You";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const openStory = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handleReply = async (storyId: string, storyOwnerId: string, mediaUrl: string, replyText: string) => {
    if (!user) return;
    try {
      const convId = await getOrCreateConversation(storyOwnerId);
      await fromTable("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        message_text: replyText,
        message_type: "story_reply",
        metadata: { story_id: storyId, media_url: mediaUrl },
      });
      toast({ title: "Reply sent!" });
    } catch (e) {
      console.error("Story reply failed:", e);
      toast({ title: "Failed to send reply", variant: "destructive" });
    }
  };

  const handleShare = (storyId: string, mediaUrl: string) => {
    setShareModal({ storyId, mediaUrl });
  };

  // Own story avatar: tap opens viewer if stories exist, long-press or + button creates
  const handleOwnStoryTap = () => {
    if (hasOwnStory) {
      const idx = storyGroups.findIndex((g) => g.user_id === user?.id);
      if (idx >= 0) openStory(idx);
    } else {
      setCreateOpen(true);
    }
  };

  return (
    <>
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {/* Own story — single icon */}
          <div className="flex flex-col items-center gap-1">
            <button onClick={handleOwnStoryTap} className="relative">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full p-[2px] ${hasOwnStory ? "bg-gradient-to-br from-primary via-petkeep-orange-light to-accent" : "bg-secondary"}`}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span className="font-display text-sm font-bold">{initials}</span>
                  )}
                </div>
              </div>
              {/* Small + badge on bottom-right corner */}
              <span
                onClick={(e) => { e.stopPropagation(); setCreateOpen(true); }}
                className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-card shadow-sm z-10"
              >
                <Plus className="h-3 w-3" />
              </span>
            </button>
            <span className="w-16 truncate text-center text-[10px] font-medium">Your Story</span>
          </div>

          {/* Followed users — one icon per user, all stories grouped */}
          {storyGroups.length <= 1 && !storyGroups.some((g) => g.user_id !== user?.id) && (
            <div className="flex items-center px-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Follow people to see their stories</span>
            </div>
          )}
          {storyGroups
            .filter((g) => g.user_id !== user?.id)
            .map((group) => {
              const realIndex = storyGroups.indexOf(group);
              return (
                <button
                  key={group.user_id}
                  className="flex flex-col items-center gap-1"
                  onClick={() => openStory(realIndex)}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary via-petkeep-orange-light to-accent p-[2px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                      {group.avatar_url ? (
                        <img src={group.avatar_url} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <span className="font-display text-sm font-bold">{group.initials}</span>
                      )}
                    </div>
                  </div>
                  <span className="w-16 truncate text-center text-[10px] font-medium">{group.username}</span>
                </button>
              );
            })}
        </div>
      </div>

      {viewerOpen && storyGroups.length > 0 && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewerIndex}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onLike={likeStory}
          onUnlike={unlikeStory}
          onReply={handleReply}
          onShare={handleShare}
          onView={recordView}
        />
      )}

      {shareModal && (
        <ShareStoryModal
          storyId={shareModal.storyId}
          mediaUrl={shareModal.mediaUrl}
          onClose={() => setShareModal(null)}
        />
      )}

      <CreateStoryModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onStoryCreated={refreshStories}
        pets={[]}
      />
    </>
  );
};

export default StoriesBar;
