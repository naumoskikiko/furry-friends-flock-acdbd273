import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, BellOff, Bell, Ban, Trash2, AlertTriangle, X, MessageSquareOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type Conversation } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ChatSettingsModalProps {
  conversation: Conversation;
  onClose: () => void;
  onMuteToggle: (muted: boolean) => void;
  onDeleteChat: () => void;
  onClearChat: () => void;
}

const ChatSettingsModal = ({
  conversation,
  onClose,
  onMuteToggle,
  onDeleteChat,
  onClearChat,
}: ChatSettingsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<"block" | "delete" | "clear" | null>(null);
  const [blocking, setBlocking] = useState(false);

  const other = conversation.other_user;
  const initials = other.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const handleBlock = async () => {
    if (!user) return;
    setBlocking(true);
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: other.user_id,
    });
    setBlocking(false);
    if (!error) {
      toast({ title: "User blocked" });
      onClose();
    } else {
      toast({ title: "Failed to block", variant: "destructive" });
    }
  };

  const handleReport = async () => {
    if (!user) return;
    // Create a support ticket for reporting
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: `Report user: ${other.full_name}`,
      message: `Reported user ${other.user_id} (${other.full_name}) from chat conversation ${conversation.id}`,
      category: "report",
    });
    if (!error) {
      toast({ title: "User reported", description: "We'll review this report shortly" });
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border animate-in slide-in-from-bottom">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Profile header */}
        <div className="flex flex-col items-center px-6 pt-2 pb-4">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={other.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-lg font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <p className="mt-2 text-base font-bold">{other.full_name}</p>
          {other.username && (
            <p className="text-xs text-muted-foreground">@{other.username}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-6 space-y-1">
          <button
            onClick={() => {
              navigate(user?.id === other.user_id ? "/profile" : `/user/${other.user_id}`);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
          >
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">View Profile</span>
          </button>

          <button
            onClick={() => {
              onMuteToggle(!conversation.is_muted);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
          >
            {conversation.is_muted ? (
              <>
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Unmute Notifications</span>
              </>
            ) : (
              <>
                <BellOff className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Mute Notifications</span>
              </>
            )}
          </button>

          <div className="my-2 border-t border-border" />

          {confirming === "clear" ? (
            <div className="rounded-xl bg-destructive/10 p-3 space-y-2">
              <p className="text-xs text-destructive font-semibold">Clear all messages? This can't be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(null)} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80">Cancel</button>
                <button onClick={() => { onClearChat(); onClose(); }} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("clear")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
            >
              <MessageSquareOff className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Clear Chat</span>
            </button>
          )}

          {confirming === "delete" ? (
            <div className="rounded-xl bg-destructive/10 p-3 space-y-2">
              <p className="text-xs text-destructive font-semibold">Delete this conversation?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(null)} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80">Cancel</button>
                <button onClick={() => { onDeleteChat(); onClose(); }} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("delete")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">Delete Chat</span>
            </button>
          )}

          <div className="my-2 border-t border-border" />

          {confirming === "block" ? (
            <div className="rounded-xl bg-destructive/10 p-3 space-y-2">
              <p className="text-xs text-destructive font-semibold">Block {other.full_name}? They won't be able to message you.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(null)} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-secondary hover:bg-secondary/80">Cancel</button>
                <button onClick={handleBlock} disabled={blocking} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {blocking ? "Blocking..." : "Block"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("block")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
            >
              <Ban className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">Block User</span>
            </button>
          )}

          <button
            onClick={handleReport}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Report User</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatSettingsModal;
