import { useState } from "react";
import { X, Search, Send, Link2, Share2, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConversations, getOrCreateConversation } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

interface ProfileShareModalProps {
  profile: {
    user_id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
  onClose: () => void;
  onShareToStory?: () => void;
}

const ProfileShareModal = ({ profile, onClose, onShareToStory }: ProfileShareModalProps) => {
  const { allConversations } = useConversations();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const profileUrl = `${window.location.origin}/user/${profile.username || profile.user_id}`;

  const filtered = allConversations.filter((c) =>
    !search ||
    c.other_user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.other_user.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendToChat = async (conv: any) => {
    if (!user) return;
    setSending(conv.id);
    try {
      await fromTable("messages").insert({
        conversation_id: conv.id,
        sender_id: user.id,
        message_text: `👤 Shared a profile: ${profile.full_name}`,
        message_type: "profile_share",
        metadata: {
          shared_user_id: profile.user_id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          profile_url: profileUrl,
        },
      });
      toast({ title: `Profile sent to ${conv.other_user.full_name}` });
      onClose();
    } catch {
      toast({ title: "Failed to share", variant: "destructive" });
    }
    setSending(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({ title: "Profile link copied!" });
    onClose();
  };

  const handleExternalShare = () => {
    if (navigator.share) {
      navigator.share({ title: profile.full_name, url: profileUrl }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-card pb-8 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display font-bold">Share Profile</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-4 px-4 py-3 border-b border-border">
          <button onClick={handleCopyLink} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Link2 className="h-5 w-5 text-foreground" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Copy Link</span>
          </button>
          {onShareToStory && (
            <button onClick={() => { onClose(); onShareToStory(); }} className="flex flex-col items-center gap-1.5 flex-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Camera className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">Add to Story</span>
            </button>
          )}
          <button onClick={handleExternalShare} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Share2 className="h-5 w-5 text-foreground" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Share</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Send to..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="max-h-52 overflow-y-auto px-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No conversations yet</p>
          ) : (
            filtered.map((c) => {
              const initials = c.other_user.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
              return (
                <button
                  key={c.id}
                  onClick={() => handleSendToChat(c)}
                  disabled={sending === c.id}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={c.other_user.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">{c.other_user.full_name}</p>
                    {c.other_user.username && <p className="text-[11px] text-muted-foreground">@{c.other_user.username}</p>}
                  </div>
                  <Send className={`h-4 w-4 ${sending === c.id ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileShareModal;
