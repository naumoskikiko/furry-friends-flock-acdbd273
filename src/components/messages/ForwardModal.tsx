import { useState } from "react";
import { X, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConversations, type Conversation, type Message } from "@/hooks/useMessages";

interface ForwardModalProps {
  message: Message | null;
  onForward: (targetConversationId: string) => void;
  onClose: () => void;
}

const ForwardModal = ({ message, onForward, onClose }: ForwardModalProps) => {
  const { allConversations } = useConversations();
  const [search, setSearch] = useState("");

  if (!message) return null;

  const filtered = search
    ? allConversations.filter(
        (c) =>
          c.other_user.full_name.toLowerCase().includes(search.toLowerCase()) ||
          c.other_user.username?.toLowerCase().includes(search.toLowerCase())
      )
    : allConversations;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border max-h-[70vh] flex flex-col animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-bold">Forward message</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-4 py-2 bg-secondary/30 border-b border-border">
          <p className="text-xs text-muted-foreground truncate">"{message.message_text}"</p>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => {
            const initials = c.other_user.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
            return (
              <button
                key={c.id}
                onClick={() => onForward(c.id)}
                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.other_user.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-bold">{c.other_user.full_name}</p>
                  {c.other_user.username && (
                    <p className="text-[11px] text-muted-foreground">@{c.other_user.username}</p>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No conversations found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
