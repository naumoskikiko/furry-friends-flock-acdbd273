import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Send, Check, CheckCheck, Search, X, MoreVertical,
  Pencil, Trash2, Flag, ChevronUp, Reply, Forward, Mic, Calendar,
  WifiOff, RefreshCw, ExternalLink, Link2, Image, AlertCircle,
} from "lucide-react";
import {
  useChatMessages, useTypingIndicator, useActivityTracking,
  useConnectionStatus, getActivityStatus, extractLinks,
  saveDraft, loadDraft,
  type Conversation, type Message, type PendingMessage,
} from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import StoryViewer, { type StoryGroup, type StoryItem } from "@/components/stories/StoryViewer";

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
  onForward?: (messageId: string) => void;
}

const ChatView = ({ conversation, onBack, onForward }: ChatViewProps) => {
  const { user } = useAuth();
  const {
    messages, pendingMessages, loading, hasMore, loadMore, sendMessage,
    retryMessage, editMessage, deleteForEveryone, deleteForMe,
    searchMessages, reportMessage,
  } = useChatMessages(conversation.id);
  const { typingUsers, setTyping } = useTypingIndicator(conversation.id);
  const isOnline = useConnectionStatus();
  const { toast } = useToast();

  useActivityTracking();

  const [text, setText] = useState(() => loadDraft(conversation.id));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const draftTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingMessages]);

  // Save draft on unmount
  useEffect(() => {
    return () => {
      if (text.trim()) saveDraft(conversation.id, text);
    };
  }, [conversation.id, text]);

  const handleTextChange = (value: string) => {
    setText(value);
    setTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 2000);
    // Debounce draft save
    if (draftTimeout.current) clearTimeout(draftTimeout.current);
    draftTimeout.current = setTimeout(() => saveDraft(conversation.id, value), 500);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const msg = text;
    const replyId = replyTo?.id;
    setText("");
    setReplyTo(null);
    setTyping(false);
    saveDraft(conversation.id, "");
    await sendMessage(msg, replyId);
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

  const scrollToMessage = (msgId: string) => {
    const el = messageRefs.current.get(msgId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2000);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const results = await searchMessages(searchQuery);
    setSearchResults(results.map((m) => m.id));
  };

  const other = conversation.other_user;
  const initials = other.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const activity = getActivityStatus(other.last_active_at);

  const getReplyPreview = (replyToId: string | null) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId);
  };

  // Render link preview inline
  const renderMessageText = (text: string, isMine: boolean) => {
    const links = extractLinks(text);
    if (links.length === 0) {
      return <p className="text-sm whitespace-pre-wrap break-words">{text}</p>;
    }

    // Replace links with clickable elements
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;
    for (const link of links) {
      const idx = remaining.indexOf(link);
      if (idx > 0) parts.push(<span key={keyIdx++}>{remaining.slice(0, idx)}</span>);
      parts.push(
        <a
          key={keyIdx++}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline underline-offset-2 inline-flex items-center gap-0.5 ${
            isMine ? "text-primary-foreground/90" : "text-primary"
          }`}
        >
          {link.length > 40 ? link.slice(0, 40) + "…" : link}
          <ExternalLink className="h-2.5 w-2.5 inline shrink-0" />
        </a>
      );
      remaining = remaining.slice(idx + link.length);
    }
    if (remaining) parts.push(<span key={keyIdx++}>{remaining}</span>);

    return (
      <div>
        <p className="text-sm whitespace-pre-wrap break-words">{parts}</p>
        {/* Rich link preview card */}
        {links.length > 0 && (
          <div className={`mt-1.5 rounded-lg border px-2.5 py-2 flex items-center gap-2 ${
            isMine ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-card"
          }`}>
            <Link2 className={`h-4 w-4 shrink-0 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-[11px] font-semibold truncate ${isMine ? "text-primary-foreground/80" : "text-foreground"}`}>
                {new URL(links[0]).hostname}
              </p>
              <p className={`text-[10px] truncate ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                {links[0]}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
          <WifiOff className="h-3.5 w-3.5" />
          You're offline — messages will send when you reconnect
        </div>
      )}

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
            {other.username && `@${other.username} · `}{activity.label}
          </p>
        </div>
        <button onClick={() => setShowSearch(!showSearch)} className="rounded-full p-1.5 hover:bg-secondary">
          {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {/* Search */}
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
          <button onClick={handleSearch} className="text-xs font-semibold text-primary">Search</button>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button onClick={loadMore} className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground">
          <ChevronUp className="h-3 w-3" /> Load older messages
        </button>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 && pendingMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm text-muted-foreground">Say hello to {other.full_name}!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const isHighlighted = searchResults.includes(msg.id);
              const canEdit = isMine && Date.now() - new Date(msg.created_at).getTime() < 15 * 60 * 1000;
              const replyPreview = getReplyPreview(msg.reply_to_id);

              // Appointment card
              if (msg.message_type === "appointment" && msg.metadata) {
                return (
                  <div key={msg.id} ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }} className="flex justify-center">
                    <div className="w-[85%] rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-primary">Appointment Booked</span>
                      </div>
                      <p className="text-sm font-semibold">{msg.metadata.provider || "Service Provider"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {msg.metadata.date} · {msg.metadata.time}
                      </p>
                      {msg.metadata.service && (
                        <p className="text-xs text-muted-foreground">{msg.metadata.service}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // System message
              if (msg.message_type === "system") {
                return (
                  <div key={msg.id} ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }} className="flex justify-center py-1">
                    <span className="text-[11px] text-muted-foreground bg-secondary/50 rounded-full px-3 py-1">
                      {msg.message_text}
                    </span>
                  </div>
                );
              }

              // Story reply card
              if (msg.message_type === "story_reply" && msg.metadata) {
                return (
                  <div
                    key={msg.id}
                    ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                    className={`group flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                      isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}>
                      {/* Story preview */}
                      <div className={`mb-2 rounded-xl overflow-hidden border ${
                        isMine ? "border-primary-foreground/20" : "border-border"
                      }`}>
                        {msg.metadata.media_url && (
                          <img src={msg.metadata.media_url} alt="" className="w-full h-24 object-cover" />
                        )}
                        <div className={`px-2.5 py-1.5 ${isMine ? "bg-primary-foreground/10" : "bg-card"}`}>
                          <p className={`text-[10px] font-semibold flex items-center gap-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            <Reply className="h-3 w-3" /> Replied to story
                          </p>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                      <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                        <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                        {isMine && (msg.is_read
                          ? <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
                          : <Check className="h-3 w-3 text-primary-foreground/60" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Story share card
              if (msg.message_type === "story_share" && msg.metadata) {
                return (
                  <div
                    key={msg.id}
                    ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                    className={`group flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl overflow-hidden ${
                      isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}>
                      {msg.metadata.media_url && (
                        <img src={msg.metadata.media_url} alt="" className="w-full h-32 object-cover" />
                      )}
                      <div className="px-3.5 py-2">
                        <p className={`text-[11px] font-semibold flex items-center gap-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          <Image className="h-3 w-3" /> Shared a story
                        </p>
                        <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>Tap to view</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                          {isMine && (msg.is_read
                            ? <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
                            : <Check className="h-3 w-3 text-primary-foreground/60" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Editing state
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
                        <button onClick={() => setEditingId(null)} className="text-[10px] text-muted-foreground">Cancel</button>
                        <button onClick={handleEdit} className="text-[10px] font-bold text-primary">Save</button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                  className={`group flex items-end gap-1.5 transition-all rounded-xl ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`relative max-w-[75%] rounded-2xl px-3.5 py-2 ${isHighlighted ? "ring-2 ring-accent" : ""} ${
                    isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}>
                    {/* Forwarded label */}
                    {msg.forwarded_from_id && (
                      <p className={`text-[9px] italic mb-0.5 flex items-center gap-1 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                        <Forward className="h-2.5 w-2.5" /> Forwarded
                      </p>
                    )}

                    {/* Reply preview */}
                    {replyPreview && (
                      <button
                        onClick={() => scrollToMessage(replyPreview.id)}
                        className={`mb-1.5 w-full text-left rounded-lg px-2.5 py-1.5 border-l-2 ${
                          isMine ? "bg-primary-foreground/10 border-primary-foreground/30" : "bg-foreground/5 border-foreground/20"
                        }`}
                      >
                        <p className={`text-[10px] font-semibold ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {replyPreview.sender_id === user?.id ? "You" : other.full_name}
                        </p>
                        <p className={`text-[11px] truncate ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {replyPreview.message_text}
                        </p>
                      </button>
                    )}

                    {/* Voice message placeholder */}
                    {msg.message_type === "voice" ? (
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        <div className="flex-1 h-1 bg-current/20 rounded-full">
                          <div className="h-1 w-1/2 bg-current rounded-full" />
                        </div>
                        <span className="text-[10px]">{msg.metadata?.duration || "0:00"}</span>
                      </div>
                    ) : (
                      renderMessageText(msg.message_text, isMine)
                    )}

                    {/* Footer */}
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                      {msg.edited_at && (
                        <span className={`text-[9px] italic ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>edited</span>
                      )}
                      <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      {isMine && (msg.is_read
                        ? <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
                        : <Check className="h-3 w-3 text-primary-foreground/60" />
                      )}
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
                      <div className="absolute bottom-full right-0 mb-1 z-50 w-48 rounded-xl border border-border bg-card shadow-lg py-1 text-sm">
                        <button
                          onClick={() => { setReplyTo(msg); setActiveMenu(null); inputRef.current?.focus(); }}
                          className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                        >
                          <Reply className="h-3.5 w-3.5" /> Reply
                        </button>
                        {onForward && (
                          <button
                            onClick={() => { onForward(msg.id); setActiveMenu(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                          >
                            <Forward className="h-3.5 w-3.5" /> Forward
                          </button>
                        )}
                        {isMine && canEdit && (
                          <button
                            onClick={() => { setEditingId(msg.id); setEditText(msg.message_text); setActiveMenu(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                        {isMine && (
                          <button
                            onClick={() => { deleteForEveryone(msg.id); setActiveMenu(null); toast({ title: "Deleted for everyone" }); }}
                            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
                          </button>
                        )}
                        <button
                          onClick={() => { deleteForMe(msg.id); setActiveMenu(null); toast({ title: "Message hidden" }); }}
                          className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete for me
                        </button>
                        {!isMine && (
                          <button
                            onClick={() => { reportMessage(msg.id, "spam"); setActiveMenu(null); toast({ title: "Message reported" }); }}
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
            })}

            {/* Pending / offline messages */}
            {pendingMessages.map((pm) => (
              <div key={pm.id} className="flex justify-end items-end gap-1.5">
                <div className="relative max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2 bg-primary/60 text-primary-foreground">
                  <p className="text-sm whitespace-pre-wrap break-words">{pm.text}</p>
                  <div className="flex items-center gap-1 mt-0.5 justify-end">
                    {pm.status === "pending" && (
                      <span className="text-[9px] text-primary-foreground/50 flex items-center gap-1">
                        <WifiOff className="h-2.5 w-2.5" /> Queued
                      </span>
                    )}
                    {pm.status === "sending" && (
                      <span className="text-[9px] text-primary-foreground/50 flex items-center gap-1">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Sending…
                      </span>
                    )}
                    {pm.status === "failed" && (
                      <button
                        onClick={() => retryMessage(pm.id)}
                        className="text-[9px] text-destructive flex items-center gap-1"
                      >
                        <RefreshCw className="h-2.5 w-2.5" /> Failed — tap to retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
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

      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2 bg-secondary/30">
          <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-primary">
              Replying to {replyTo.sender_id === user?.id ? "yourself" : other.full_name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{replyTo.message_text}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="rounded-full p-1 hover:bg-secondary">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={isOnline ? "Type a message..." : "Message will be queued..."}
            className="flex-1 rounded-xl bg-secondary px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            {text.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
