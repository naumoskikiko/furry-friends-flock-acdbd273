import { useState } from "react";
import { Plus } from "lucide-react";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import StoryViewer from "@/components/stories/StoryViewer";
import CreateStoryModal from "@/components/stories/CreateStoryModal";

const StoriesBar = () => {
  const { user, profile } = useAuth();
  const { storyGroups, hasOwnStory, refreshStories } = useStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "You";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const openStory = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {/* Own story button */}
          <button
            className="flex flex-col items-center gap-1"
            onClick={() => {
              if (hasOwnStory) {
                const idx = storyGroups.findIndex((g) => g.user_id === user?.id);
                if (idx >= 0) openStory(idx);
              } else {
                setCreateOpen(true);
              }
            }}
          >
            <div className={`flex h-16 w-16 items-center justify-center rounded-full p-[2px] ${hasOwnStory ? "bg-gradient-to-br from-primary via-petkeep-orange-light to-accent" : "bg-secondary"}`}>
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-card">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="font-display text-sm font-bold">{initials}</span>
                )}
                {!hasOwnStory && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    <Plus className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>
            <span className="w-16 truncate text-center text-[10px] font-medium">Your Story</span>
          </button>

          {/* Other stories */}
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
