import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import { useChatMessages, type Conversation } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

const ChatView = ({ conversation, onBack }: ChatViewProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChatMessages(conversation.id);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const msg = text;
    setText("");
    await sendMessage(msg);
    inputRef.current?.focus();
  };

  const other = conversation.other_user;
  const initials = other.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <button onClick={onBack} className="rounded-full p-1.5 hover:bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={other.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-bold leading-tight">{other.full_name}</p>
          {other.username && (
            <p className="text-[11px] text-muted-foreground">@{other.username}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
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
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                    <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                    {isMine && (
                      msg.is_read
                        ? <CheckCheck className={`h-3 w-3 text-primary-foreground/60`} />
                        : <Check className={`h-3 w-3 text-primary-foreground/60`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
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
