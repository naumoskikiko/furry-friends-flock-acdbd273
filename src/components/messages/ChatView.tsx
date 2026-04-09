import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Check, CheckCheck, Search, X, MoreVertical,
  Pencil, Trash2, Flag, ChevronUp, Reply, Forward, Mic, Calendar,
  WifiOff, RefreshCw, ExternalLink, Link2, Image, AlertCircle,
  CheckCircle2, XCircle, Ban, Settings, Square, MapPin, ShoppingCart,
} from "lucide-react";
import ChatSettingsModal from "./ChatSettingsModal";
import VoiceMessageBubble from "./VoiceMessageBubble";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import GroupSettingsModal from "./GroupSettingsModal";
import {
  useChatMessages, useTypingIndicator, useActivityTracking,
  useConnectionStatus, getActivityStatus, extractLinks,
  saveDraft, loadDraft, updateBookingFromChat,
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
  onMuteToggle?: (conversationId: string, muted: boolean) => void;
  onDeleteChat?: (conversationId: string) => void;
  onClearChat?: (conversationId: string) => void;
}

const ChatView = ({ conversation, onBack, onForward, onMuteToggle, onDeleteChat, onClearChat }: ChatViewProps) => {
  const { user } = useAuth();
  const {
    messages, pendingMessages, loading, hasMore, loadMore, sendMessage,
    retryMessage, editMessage, deleteForEveryone, deleteForMe,
    searchMessages, reportMessage,
  } = useChatMessages(conversation.id);
  const { typingUsers, setTyping } = useTypingIndicator(conversation.id);
  const isOnline = useConnectionStatus();
  const { toast } = useToast();
  const navigate = useNavigate();

  useActivityTracking();

  const [text, setText] = useState(() => loadDraft(conversation.id));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [storyViewerData, setStoryViewerData] = useState<{ groups: StoryGroup[]; open: boolean } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const voiceRecorder = useVoiceRecorder();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const draftTimeout = useRef<ReturnType<typeof setTimeout>>();
  const justSentRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingMessages]);

  // Handle mobile keyboard: scroll to bottom when virtual keyboard opens
  useEffect(() => {
    const handleResize = () => {
      // When keyboard opens, visualViewport height shrinks
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", handleResize);
      return () => vv.removeEventListener("resize", handleResize);
    }
  }, []);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  // Save draft on unmount & cancel pending draft timeout
  useEffect(() => {
    return () => {
      if (draftTimeout.current) clearTimeout(draftTimeout.current);
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
    // Cancel any pending draft save so it doesn't re-save old text
    if (draftTimeout.current) clearTimeout(draftTimeout.current);
    saveDraft(conversation.id, "");
    await sendMessage(msg, replyId);
    inputRef.current?.focus();
  };

  const handleSendVoice = async () => {
    if (!voiceRecorder.audioBlob || !user) return;
    voiceRecorder.stopRecording();
    const blob = voiceRecorder.audioBlob;
    const duration = voiceRecorder.duration;
    const ext = blob.type.includes("mp4") ? "m4a" : "webm";
    const fileName = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("voice-messages")
      .upload(fileName, blob, { contentType: blob.type });

    if (uploadError) {
      toast({ title: "Failed to upload voice message", variant: "destructive" });
      return;
    }

    const { data: urlData } = supabaseClient.storage
      .from("voice-messages")
      .getPublicUrl(fileName);

    await sendMessage("🎤 Voice message", undefined, "voice", {
      audio_url: urlData.publicUrl,
      duration,
    });

    voiceRecorder.resetRecording();
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

  const openStoryFromMessage = async (metadata: any) => {
    if (!metadata?.story_id) return;
    const fromTable = (table: string) => (supabase as any).from(table);
    const { data: story } = await fromTable("stories")
      .select("*")
      .eq("id", metadata.story_id)
      .maybeSingle();

    if (!story) {
      toast({ title: "This story is no longer available", variant: "destructive" });
      return;
    }

    const isExpired = new Date(story.expires_at) < new Date();
    if (isExpired) {
      toast({ title: "This story has expired", variant: "destructive" });
      return;
    }

    // Fetch profile for the story owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, username")
      .eq("user_id", story.user_id)
      .maybeSingle();

    const name = profile?.full_name || "User";
    const storyItem: StoryItem = {
      id: story.id,
      user_id: story.user_id,
      media_url: story.media_url,
      media_type: story.media_type || "image",
      caption: story.caption || "",
      location: story.location || "",
      text_overlay: story.text_overlay || "",
      sticker: story.sticker || "",
      created_at: story.created_at,
      likes_count: 0,
      is_liked: false,
    };

    const group: StoryGroup = {
      user_id: story.user_id,
      username: name,
      avatar_url: profile?.avatar_url || null,
      initials: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      stories: [storyItem],
    };

    setStoryViewerData({ groups: [group], open: true });
  };

  const isGroup = conversation.is_group || false;
  const other = conversation.other_user;
  const chatName = isGroup ? (conversation.group_name || "Group") : other.full_name;
  const initials = isGroup
    ? (conversation.group_name || "G").slice(0, 2).toUpperCase()
    : other.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const activity = isGroup
    ? { isOnline: false, label: `${(conversation.group_members?.length || 0) + 1} members` }
    : getActivityStatus(other.last_active_at);

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
    <div ref={containerRef} className="flex h-full flex-col overflow-hidden">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
          <WifiOff className="h-3.5 w-3.5" />
          You're offline — messages will send when you reconnect
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-card/95 backdrop-blur-md px-3 py-2 shrink-0 sticky top-0 z-20">
        <button onClick={onBack} className="shrink-0 rounded-full p-1.5 hover:bg-secondary active:scale-95 transition-transform -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => !isGroup && navigate(user?.id === other.user_id ? "/profile" : `/user/${other.user_id}`)}
          className="flex flex-1 items-center gap-2.5 min-w-0 rounded-lg px-1 py-1 hover:bg-secondary/50 transition-colors"
        >
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9 ring-2 ring-border">
              <AvatarImage src={isGroup ? (conversation.group_image_url || undefined) : (other.avatar_url || undefined)} />
              <AvatarFallback className={`text-xs font-bold text-primary-foreground ${isGroup ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" : "bg-gradient-to-br from-primary to-accent"}`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            {activity.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold leading-tight truncate">{chatName}</p>
            <p className="text-[11px] leading-tight">
              {typingUsers.length > 0 ? (
                <span className="text-primary font-semibold animate-pulse">Typing…</span>
              ) : !isGroup && activity.isOnline ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
              ) : (
                <span className="text-muted-foreground">{activity.label}</span>
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center shrink-0">
          <button onClick={() => setShowSearch(!showSearch)} className="rounded-full p-2 hover:bg-secondary active:scale-95 transition-transform">
            {showSearch ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-full p-2 hover:bg-secondary active:scale-95 transition-transform"
          >
            <MoreVertical className="h-[18px] w-[18px]" />
          </button>
        </div>
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

      {/* Meetup banner */}
      {conversation.meetup_id && (
        <button
          onClick={() => navigate(`/?blog=${conversation.meetup_id}`)}
          className="flex items-center gap-2.5 border-b border-border bg-primary/5 px-4 py-2.5 text-left transition-colors hover:bg-primary/10 active:scale-[0.99]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary truncate">📍 MeetUP Event</p>
            <p className="text-[10px] text-muted-foreground">Tap to view event details</p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      )}

      {/* Load more */}
      {hasMore && (
        <button onClick={loadMore} className="flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground">
          <ChevronUp className="h-3 w-3" /> Load older messages
        </button>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
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

              // Appointment card (legacy)
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

              // Booking request card with actions
              if (msg.message_type === "booking_request" && msg.metadata) {
                const meta = msg.metadata;
                const bookingStatus = meta.status || "pending";
                const isProvider = !isMine; // provider receives the request
                const statusColors: Record<string, string> = {
                  pending: "text-amber-600 dark:text-amber-400",
                  confirmed: "text-green-600 dark:text-green-400",
                  rejected: "text-destructive",
                  cancelled: "text-muted-foreground",
                };

                const handleBookingAction = async (action: "confirmed" | "rejected" | "cancelled") => {
                  try {
                    await updateBookingFromChat(meta.booking_id, action, conversation.id);
                    // Update local metadata
                    const updatedMeta = { ...meta, status: action };
                    const fromTable = (table: string) => (supabase as any).from(table);
                    await fromTable("messages")
                      .update({ metadata: updatedMeta })
                      .eq("id", msg.id);
                    toast({ title: `Booking ${action}` });
                  } catch (e: any) {
                    toast({ title: "Action failed", description: e.message, variant: "destructive" });
                  }
                };

                return (
                  <div key={msg.id} ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }} className="flex justify-center">
                    <div className="w-[85%] rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-primary">Booking Request</span>
                        <span className={`ml-auto text-[10px] font-bold capitalize ${statusColors[bookingStatus] || ""}`}>
                          {bookingStatus}
                        </span>
                      </div>
                      <p className="text-sm font-semibold">{meta.service_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📅 {meta.date} · 🕐 {meta.time}
                      </p>
                      {meta.pet_name && (
                        <p className="text-xs text-muted-foreground">🐾 {meta.pet_name}</p>
                      )}
                      <p className="text-xs font-semibold mt-1">{meta.price} MKD</p>

                      {/* Actions */}
                      {bookingStatus === "pending" && isProvider && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleBookingAction("confirmed")}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                          </button>
                          <button
                            onClick={() => handleBookingAction("rejected")}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      )}

                      {bookingStatus === "confirmed" && (
                        <button
                          onClick={() => handleBookingAction("cancelled")}
                          className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <Ban className="h-3.5 w-3.5" /> Cancel Appointment
                        </button>
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
                      {/* Story preview - clickable */}
                      <button
                        onClick={() => openStoryFromMessage(msg.metadata)}
                        className={`mb-2 rounded-xl overflow-hidden border w-full text-left ${
                          isMine ? "border-primary-foreground/20" : "border-border"
                        }`}
                      >
                        {msg.metadata.media_url && (
                          <img src={msg.metadata.media_url} alt="" className="w-full h-24 object-cover" />
                        )}
                        <div className={`px-2.5 py-1.5 ${isMine ? "bg-primary-foreground/10" : "bg-card"}`}>
                          <p className={`text-[10px] font-semibold flex items-center gap-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            <Reply className="h-3 w-3" /> Replied to story · Tap to view
                          </p>
                        </div>
                      </button>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                      <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                        <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                        {isMine && (msg.is_read
                          ? <CheckCheck className="h-3 w-3 text-blue-400" />
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
                    <button
                      onClick={() => openStoryFromMessage(msg.metadata)}
                      className={`max-w-[80%] rounded-2xl overflow-hidden text-left shadow-sm ${
                        isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.metadata.media_url && (
                        <img src={msg.metadata.media_url} alt="" className="w-full h-36 object-cover" />
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
                            ? <CheckCheck className="h-3 w-3 text-blue-400" />
                            : <Check className="h-3 w-3 text-primary-foreground/60" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              }

              // Post share card
              if (msg.message_type === "post_share" && msg.metadata) {
                return (
                  <div
                    key={msg.id}
                    ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                    className={`group flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <button
                      onClick={() => navigate(`/post/${msg.metadata.post_id}`)}
                      className={`max-w-[80%] rounded-2xl overflow-hidden text-left shadow-sm ${
                        isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.metadata.image_url && (
                        <img src={msg.metadata.image_url} alt="" className="w-full h-40 object-cover" />
                      )}
                      <div className="px-3.5 py-2">
                        <p className={`text-[11px] font-semibold flex items-center gap-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          <Image className="h-3 w-3" /> Shared a post
                        </p>
                        {msg.metadata.username && (
                          <p className={`text-xs font-bold mt-0.5`}>{msg.metadata.username}</p>
                        )}
                        {msg.metadata.caption && (
                          <p className={`text-[11px] mt-0.5 truncate ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {msg.metadata.caption}
                          </p>
                        )}
                        <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>Tap to view post</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                          {isMine && (msg.is_read
                            ? <CheckCheck className="h-3 w-3 text-blue-400" />
                            : <Check className="h-3 w-3 text-primary-foreground/60" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              }

              // Blog / Meetup share card
              if (msg.message_type === "blog_share" && msg.metadata) {
                const isMeetup = msg.metadata.post_type === "meetup";
                return (
                  <div
                    key={msg.id}
                    ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                    className={`group flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <button
                      onClick={async () => {
                        try {
                          const { data } = await (supabaseClient as any)
                            .from("blog_posts")
                            .select("*")
                            .eq("id", msg.metadata.post_id)
                            .single();
                          if (!data) {
                            toast({ title: isMeetup ? "This meetup is no longer available" : "This article is no longer available", variant: "destructive" });
                            return;
                          }
                          // Navigate to Index page blog tab — store selected blog post id for opening
                          navigate(`/?blog=${msg.metadata.post_id}`);
                        } catch {
                          toast({ title: "Failed to open", variant: "destructive" });
                        }
                      }}
                      className={`max-w-[80%] rounded-2xl overflow-hidden text-left shadow-sm transition-transform active:scale-[0.98] ${
                        isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.metadata.image_url && (
                        <img src={msg.metadata.image_url} alt="" className="w-full h-40 object-cover" />
                      )}
                      <div className="px-3.5 py-2">
                        <p className={`text-[11px] font-semibold flex items-center gap-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {isMeetup ? (
                            <><Calendar className="h-3 w-3" /> Shared a MeetUP</>
                          ) : (
                            <><ExternalLink className="h-3 w-3" /> Shared an article</>
                          )}
                        </p>
                        {msg.metadata.caption && (
                          <p className="text-xs font-bold mt-0.5 line-clamp-2">{msg.metadata.caption}</p>
                        )}
                        {isMeetup && msg.metadata.event_date && (
                          <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(msg.metadata.event_date).toLocaleDateString()}
                          </p>
                        )}
                        {isMeetup && msg.metadata.event_location && (
                          <p className={`text-[10px] flex items-center gap-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            <MapPin className="h-3 w-3" />
                            {msg.metadata.event_location}
                          </p>
                        )}
                        <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                          Tap to view {isMeetup ? "meetup" : "article"}
                        </p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                          {isMine && (msg.is_read
                            ? <CheckCheck className="h-3 w-3 text-blue-400" />
                            : <Check className="h-3 w-3 text-primary-foreground/60" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              }

              // Product share card
              if (msg.message_type === "product_share" && msg.metadata) {
                return (
                  <div
                    key={msg.id}
                    ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                    className={`group flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <button
                      onClick={async () => {
                        try {
                          const { data } = await (supabaseClient as any)
                            .from("products")
                            .select("id, is_active")
                            .eq("id", msg.metadata.post_id)
                            .single();
                          if (!data) {
                            toast({ title: "This product is no longer available", variant: "destructive" });
                            return;
                          }
                          navigate(`/product/${msg.metadata.post_id}`);
                        } catch {
                          toast({ title: "Failed to open product", variant: "destructive" });
                        }
                      }}
                      className={`max-w-[80%] rounded-2xl overflow-hidden text-left shadow-sm transition-transform active:scale-[0.98] ${
                        isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.metadata.image_url && (
                        <img src={msg.metadata.image_url} alt="" className="w-full h-40 object-cover" />
                      )}
                      <div className="px-3.5 py-2">
                        <p className={`text-[11px] font-semibold flex items-center gap-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          <ShoppingCart className="h-3 w-3" /> Shared a product
                        </p>
                        {msg.metadata.caption && (
                          <p className="text-xs font-bold mt-0.5 line-clamp-2">{msg.metadata.caption}</p>
                        )}
                        {msg.metadata.price != null && (
                          <p className={`text-sm font-extrabold mt-0.5 ${isMine ? "text-primary-foreground" : "text-primary"}`}>
                            {Number(msg.metadata.price).toLocaleString()} MKD
                          </p>
                        )}
                        {msg.metadata.username && (
                          <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {msg.metadata.username}
                          </p>
                        )}
                        <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>Tap to view product</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                          {isMine && (msg.is_read
                            ? <CheckCheck className="h-3 w-3 text-blue-400" />
                            : <Check className="h-3 w-3 text-primary-foreground/60" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              }

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

                    {/* Voice message */}
                    {msg.message_type === "voice" && msg.metadata?.audio_url ? (
                      <VoiceMessageBubble
                        audioUrl={msg.metadata.audio_url}
                        duration={msg.metadata.duration || 0}
                        isMine={isMine}
                        playingId={playingVoiceId}
                        messageId={msg.id}
                        onPlay={(id) => setPlayingVoiceId(id)}
                        onStop={() => setPlayingVoiceId(null)}
                      />
                    ) : msg.message_type !== "voice" ? (
                      renderMessageText(msg.message_text, isMine)
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        <span className="text-[10px]">Voice message</span>
                      </div>
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
                        ? <CheckCheck className="h-3 w-3 text-blue-400" />
                        : <Check className="h-3 w-3 text-primary-foreground/60" />
                      )}
                    </div>
                  </div>

                  {/* Actions menu */}
                   <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === msg.id ? null : msg.id)}
                      className="opacity-0 group-hover:opacity-100 rounded-full p-1.5 hover:bg-secondary transition-opacity active:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {activeMenu === msg.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-56 rounded-2xl border border-border bg-card shadow-xl py-2 text-sm">
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
                      </>
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

      {/* Input — check if meetup chat is ended */}
      {conversation.meetup_ended ? (
        <div className="border-t border-border px-4 py-3 bg-muted/50 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center">
          <p className="text-sm font-medium text-muted-foreground">📍 This meetup has ended — chat is read-only</p>
        </div>
      ) : (
      <div className="border-t border-border px-3 py-2 bg-card shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Voice recording UI */}
        {voiceRecorder.isRecording ? (
          <div className="flex items-center gap-3">
            <button
              onClick={voiceRecorder.cancelRecording}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive active:scale-90 transition-transform"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-semibold tabular-nums">
                {Math.floor(voiceRecorder.duration / 60)}:{(voiceRecorder.duration % 60).toString().padStart(2, "0")}
              </span>
              {/* Mini waveform animation */}
              <div className="flex items-center gap-[2px] flex-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-primary/40"
                    style={{
                      height: `${8 + Math.sin(Date.now() / 200 + i) * 8}px`,
                      animation: `pulse 0.8s ease-in-out ${i * 0.04}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={voiceRecorder.stopRecording}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 transition-transform"
            >
              <Square className="h-4 w-4" />
            </button>
          </div>
        ) : voiceRecorder.audioBlob ? (
          /* Preview before sending */
          <div className="flex items-center gap-3">
            <button
              onClick={voiceRecorder.resetRecording}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive active:scale-90 transition-transform"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {Math.floor(voiceRecorder.duration / 60)}:{(voiceRecorder.duration % 60).toString().padStart(2, "0")}
              </span>
              <span className="text-xs text-muted-foreground">Ready to send</span>
            </div>
            <button
              onClick={handleSendVoice}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 transition-transform"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Normal text input */
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => {
                handleTextChange(e.target.value);
                autoResize();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                  setTimeout(autoResize, 0);
                }
              }}
              onFocus={() => {
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
              }}
              rows={1}
              placeholder={isOnline ? "Type a message..." : "Message will be queued..."}
              className="flex-1 min-w-0 rounded-[1.25rem] bg-secondary px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 transition-shadow resize-none max-h-[120px] leading-5"
              style={{ height: "auto" }}
            />
            {text.trim() ? (
              <button
                onClick={handleSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 transition-all mb-0.5"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={voiceRecorder.startRecording}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 transition-all mb-0.5"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {/* Permission denied message */}
        {voiceRecorder.permissionDenied && (
          <p className="text-xs text-destructive mt-1.5 text-center">
            {voiceRecorder.error}
          </p>
        )}
      </div>
      )}
      {/* Story viewer from chat */}
      {storyViewerData?.open && (
        <StoryViewer
          groups={storyViewerData.groups}
          initialGroupIndex={0}
          open={true}
          onClose={() => setStoryViewerData(null)}
        />
      )}
      {/* Chat settings */}
      {showSettings && (
        isGroup ? (
          <GroupSettingsModal
            conversation={conversation}
            onClose={() => setShowSettings(false)}
            onLeft={() => { setShowSettings(false); onBack(); }}
            onDeleted={() => { setShowSettings(false); onBack(); }}
          />
        ) : (
          <ChatSettingsModal
            conversation={conversation}
            onClose={() => setShowSettings(false)}
            onMuteToggle={(muted) => {
              onMuteToggle?.(conversation.id, muted);
            }}
            onDeleteChat={() => {
              onDeleteChat?.(conversation.id);
              onBack();
            }}
            onClearChat={() => {
              onClearChat?.(conversation.id);
            }}
          />
        )
      )}
    </div>
  );
};

export default ChatView;
