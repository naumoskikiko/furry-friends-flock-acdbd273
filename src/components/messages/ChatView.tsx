import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Search,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Flag,
  ChevronUp,
} from "lucide-react";
import {
  useChatMessages,
  useTypingIndicator,
  useActivityTracking,
  getActivityStatus,
  type Conversation,
} from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

const ChatView = ({ conversation, onBack }: ChatViewProps) => {
  const { user } = useAuth();
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    editMessage,
    deleteForEveryone,
    deleteForMe,
    searchMessages,
    reportMessage,
  } = useChatMessages(conversation.id);
  const { typingUsers, setTyping } = useTypingIndicator(conversation.id);
  const { toast } = useToast();

  useActivityTracking();

  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing indicator
  const handleTextChange = (value: string) => {
    setText(value);
    setTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 2000);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const msg = text;
    setText("");
    setTyping(false);
    await sendMessage(msg);
    inputRef.current?.focus();
  };

  const handleEdit = async () => {
    if (!editingId || !editText.trim()) return;
    const ok = await editMessage(editingId, editText);
    if (ok) {
      setEditingId(null);
      setEditText("");
      toast({ title: "Message edited" });
    } else {
      toast({ title: "Cannot edit", description: "15‑minute limit exceeded", variant: "destructive" });
    }
  };

  const handleDeleteForEveryone = async (id: string) => {
    await deleteForEveryone(id);
    setActiveMenu(null);
    toast({ title: "Message deleted for everyone" });
  };

  const handleDeleteForMe = async (id: string) => {
    await deleteForMe(id);
    setActiveMenu(null);
    toast({ title: "Message hidden" });
  };

  const handleReport = async (id: string) => {
    await reportMessage(id, "spam");
    setActiveMenu(null);
    toast({ title: "Message reported" });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchMessages(searchQuery);
    setSearchResults(results.map((m) => m.id));
  };

  const other = conversation.other_user;
  const initials =
    other.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const activity = getActivityStatus(other.last_active_at);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <button onClick={onBack} className="rounded-full p-1.5 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={other.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {activity.isOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight truncate">{other.full_name}</p>
          <p className="text-[10px] text-muted-foreground">
            {other.username && `@${other.username} · `}
            {activity.label}
          </p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="rounded-full p-1.5 hover:bg-secondary"
        >
          {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-secondary/30">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <button onClick={handleSearch} className="text-xs font-semibold text-primary">
            Search
          </button>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={loadMore}
          className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-3 w-3" /> Load older messages
        </button>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <div ref={topRef} />
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm text-muted-foreground">Say hello to {other.full_name}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            const isHighlighted = searchResults.includes(msg.id);
            const canEdit =
              isMine && Date.now() - new Date(msg.created_at).getTime() < 15 * 60 * 1000;

            if (editingId === msg.id) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] space-y-1">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none ring-2 ring-primary"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[10px] text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button onClick={handleEdit} className="text-[10px] font-bold text-primary">
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`group flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
              >
                {/* Message bubble */}
                <div
                  className={`relative max-w-[75%] rounded-2xl px-3.5 py-2 ${
                    isHighlighted ? "ring-2 ring-yellow-400" : ""
                  } ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                  <div
                    className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}
                  >
                    {msg.edited_at && (
                      <span
                        className={`text-[9px] italic ${
                          isMine ? "text-primary-foreground/50" : "text-muted-foreground"
                        }`}
                      >
                        edited
                      </span>
                    )}
                    <span
                      className={`text-[10px] ${
                        isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                    {isMine &&
                      (msg.is_read ? (
                        <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
                      ) : (
                        <Check className="h-3 w-3 text-primary-foreground/60" />
                      ))}
                  </div>
                </div>

                {/* Actions menu */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === msg.id ? null : msg.id)}
                    className="opacity-0 group-hover:opacity-100 rounded-full p-1 hover:bg-secondary transition-opacity"
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {activeMenu === msg.id && (
                    <div className="absolute bottom-full right-0 mb-1 z-50 w-44 rounded-xl border border-border bg-card shadow-lg py-1 text-sm">
                      {isMine && canEdit && (
                        <button
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditText(msg.message_text);
                            setActiveMenu(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      )}
                      {isMine && (
                        <button
                          onClick={() => handleDeleteForEveryone(msg.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteForMe(msg.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete for me
                      </button>
                      {!isMine && (
                        <button
                          onClick={() => handleReport(msg.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary text-destructive"
                        >
                          <Flag className="h-3.5 w-3.5" /> Report
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-xl bg-secondary px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
