import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cacheGet, cacheSet, CacheTTL } from "@/lib/cache";

export interface Conversation {
  id: string;
  created_at: string;
  other_user: {
    user_id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
    last_active_at: string | null;
  };
  is_group?: boolean;
  group_name?: string | null;
  group_image_url?: string | null;
  group_members?: Array<{
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  }>;
  last_message?: {
    message_text: string;
    created_at: string;
    sender_id: string;
    deleted_at: string | null;
    message_type: string;
  };
  unread_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  is_muted: boolean;
  draft?: string;
  meetup_id?: string;
  meetup_ended?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  is_read: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  message_type: string;
  metadata: any | null;
  client_status?: "sending" | "failed" | "queued";
}

export interface PendingMessage {
  id: string;
  text: string;
  replyToId?: string;
  messageType: string;
  metadata?: any;
  status: "pending" | "sending" | "failed";
  timestamp: number;
  conversationId?: string;
}

const fromTable = (table: string) => (supabase as any).from(table);
const MESSAGES_PAGE_SIZE = 50;
const DRAFT_KEY = (convId: string) => `msg_draft_${convId}`;
const QUEUE_KEY = "msg_offline_queue";

// --- Drafts ---
export function saveDraft(conversationId: string, text: string) {
  if (!text.trim()) {
    localStorage.removeItem(DRAFT_KEY(conversationId));
  } else {
    localStorage.setItem(DRAFT_KEY(conversationId), text);
  }
}

export function loadDraft(conversationId: string): string {
  return localStorage.getItem(DRAFT_KEY(conversationId)) || "";
}

// --- Offline queue ---
function getOfflineQueue(): PendingMessage[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch { return []; }
}

function setOfflineQueue(queue: PendingMessage[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function addToQueue(msg: PendingMessage) {
  const queue = getOfflineQueue();
  queue.push(msg);
  setOfflineQueue(queue);
}

function removeFromQueue(id: string) {
  const queue = getOfflineQueue().filter((m) => m.id !== id);
  setOfflineQueue(queue);
}

function attachClientTempId(metadata: any, clientTempId: string) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...metadata, client_temp_id: clientTempId };
  }
  return { client_temp_id: clientTempId };
}

function getClientTempId(message: Pick<Message, "id" | "metadata">) {
  const metadataTempId =
    message.metadata &&
    typeof message.metadata === "object" &&
    !Array.isArray(message.metadata)
      ? (message.metadata as Record<string, any>).client_temp_id
      : undefined;

  return metadataTempId || (message.id.startsWith("optimistic_") ? message.id : undefined);
}

function sortMessages(items: Message[]) {
  return [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function dedupeMessages(items: Message[]) {
  const byId = new Map<string, Message>();
  items.forEach((item) => byId.set(item.id, item));
  return sortMessages(Array.from(byId.values()));
}

function upsertMessage(items: Message[], incoming: Message) {
  const incomingTempId = getClientTempId(incoming);
  let replaced = false;

  const next = items.map((item) => {
    if (item.id === incoming.id) {
      replaced = true;
      return incoming;
    }

    if (incomingTempId && getClientTempId(item) === incomingTempId) {
      replaced = true;
      return incoming;
    }

    return item;
  });

  return replaced ? sortMessages(next) : dedupeMessages([...items, incoming]);
}

function mergeFetchedMessages(existing: Message[], fetched: Message[]) {
  const localOnly = existing.filter((item) => {
    if (!item.client_status) return false;
    const tempId = getClientTempId(item);
    return !tempId || !fetched.some((serverItem) => getClientTempId(serverItem) === tempId);
  });

  return dedupeMessages([...fetched, ...localOnly]);
}

// --- Connection status ---
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return isOnline;
}

// --- Activity status tracking ---
let activityInterval: ReturnType<typeof setInterval> | null = null;

export function useActivityTracking() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const updateActivity = async () => {
      await supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    };
    updateActivity();
    activityInterval = setInterval(updateActivity, 60000);
    return () => {
      if (activityInterval) clearInterval(activityInterval);
    };
  }, [user]);
}

// --- Link preview detection ---
const URL_REGEX = /https?:\/\/[^\s<]+/g;

export function extractLinks(text: string): string[] {
  return text.match(URL_REGEX) || [];
}

export function isLinkMessage(text: string): boolean {
  return URL_REGEX.test(text);
}

// --- Conversations ---
export function useConversations() {
  const { user } = useAuth();
  const CACHE_KEY = `convos_${user?.id || "anon"}`;
  const [conversations, setConversations] = useState<Conversation[]>(() => cacheGet<Conversation[]>(CACHE_KEY) || []);
  const [loading, setLoading] = useState(!cacheGet<Conversation[]>(CACHE_KEY));
  const [showArchived, setShowArchived] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: participations } = await fromTable("conversation_participants")
      .select("conversation_id, is_pinned, is_archived, is_muted")
      .eq("user_id", user.id);

    if (!participations?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participations.map((p: any) => p.conversation_id);
    const metaMap = new Map<string, { is_pinned: boolean; is_archived: boolean; is_muted: boolean }>(
      participations.map((p: any) => [
        p.conversation_id,
        { is_pinned: !!p.is_pinned, is_archived: !!p.is_archived, is_muted: !!p.is_muted },
      ])
    );

    // Fetch conversation details (for group info)
    const { data: convDetails } = await fromTable("conversations")
      .select("id, is_group, group_name, group_image_url, created_by")
      .in("id", convIds);

    const convDetailMap = new Map(
      (convDetails || []).map((c: any) => [c.id, c])
    );

    // Find meetup-linked conversations
    const groupConvIds = (convDetails || []).filter((c: any) => c.is_group).map((c: any) => c.id);
    let meetupMap = new Map<string, string>();
    if (groupConvIds.length > 0) {
      const { data: meetupLinks } = await fromTable("blog_posts")
        .select("id, conversation_id")
        .in("conversation_id", groupConvIds)
        .eq("post_type", "meetup");
      if (meetupLinks) {
        meetupLinks.forEach((m: any) => meetupMap.set(m.conversation_id, m.id));
      }
    }

    const { data: otherParticipants } = await fromTable("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds)
      .neq("user_id", user.id);

    const otherUserIds = [...new Set((otherParticipants || []).map((p: any) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url, last_active_at" as any)
      .in("user_id", otherUserIds.length ? otherUserIds as string[] : ["__none__"]);

    const profileMap = new Map((profiles as any[])?.map((p: any) => [p.user_id, p]) || []);

    const convList: Conversation[] = [];

    for (const convId of convIds) {
      const detail = convDetailMap.get(convId) as any;
      const isGroup = !!detail?.is_group;
      const convOtherPs = (otherParticipants || []).filter((p: any) => p.conversation_id === convId);

      // For 1:1 chats, need at least one other participant
      if (!isGroup && convOtherPs.length === 0) continue;

      const firstOther = convOtherPs[0];
      const profile = firstOther ? profileMap.get(firstOther.user_id) as any : null;

      // For 1:1 chats, must have a valid profile
      if (!isGroup && !profile) continue;

      const { data: lastMsg } = await fromTable("messages")
        .select("id, message_text, created_at, sender_id, deleted_at, message_type")
        .eq("conversation_id", convId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await fromTable("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .eq("is_read", false)
        .is("deleted_at", null)
        .neq("sender_id", user.id);

      const meta = metaMap.get(convId) || { is_pinned: false, is_archived: false, is_muted: false };
      const draft = loadDraft(convId);

      // Build group members list
      const groupMembers = isGroup
        ? convOtherPs.map((p: any) => {
            const prof = profileMap.get(p.user_id) as any;
            return {
              user_id: p.user_id,
              full_name: prof?.full_name || "Unknown",
              avatar_url: prof?.avatar_url || null,
            };
          })
        : undefined;

      convList.push({
        id: convId,
        created_at: lastMsg?.created_at || "",
        other_user: {
          user_id: profile?.user_id || "",
          full_name: isGroup ? (detail?.group_name || "Group") : (profile?.full_name || ""),
          username: profile?.username || null,
          avatar_url: isGroup ? (detail?.group_image_url || null) : (profile?.avatar_url || null),
          last_active_at: profile?.last_active_at || null,
        },
        is_group: isGroup,
        group_name: detail?.group_name || null,
        group_image_url: detail?.group_image_url || null,
        group_members: groupMembers,
        last_message: lastMsg
          ? {
              message_text: lastMsg.deleted_at ? "This message was deleted" : lastMsg.message_text,
              created_at: lastMsg.created_at,
              sender_id: lastMsg.sender_id,
              deleted_at: lastMsg.deleted_at,
              message_type: lastMsg.message_type || "text",
            }
          : undefined,
        unread_count: count || 0,
        is_pinned: meta.is_pinned,
        is_archived: meta.is_archived,
        is_muted: meta.is_muted,
        draft: draft || undefined,
        meetup_id: meetupMap.get(convId) || undefined,
      });
    }

    // Smart sorting: pinned → unread → recent
    convList.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
      const ta = a.last_message?.created_at || a.created_at;
      const tb = b.last_message?.created_at || b.created_at;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });

    setConversations(convList);
    cacheSet(CACHE_KEY, convList, CacheTTL.CHAT_LIST);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`conversations-refresh-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const togglePin = useCallback(
    async (conversationId: string, pinned: boolean) => {
      if (!user) return;
      await fromTable("conversation_participants")
        .update({ is_pinned: pinned })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      fetchConversations();
    },
    [user, fetchConversations]
  );

  const toggleArchive = useCallback(
    async (conversationId: string, archived: boolean) => {
      if (!user) return;
      await fromTable("conversation_participants")
        .update({ is_archived: archived })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      fetchConversations();
    },
    [user, fetchConversations]
  );

  const toggleMute = useCallback(
    async (conversationId: string, muted: boolean) => {
      if (!user) return;
      await fromTable("conversation_participants")
        .update({ is_muted: muted })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      fetchConversations();
    },
    [user, fetchConversations]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      // Remove user from conversation so it disappears from their list
      await fromTable("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      // Update local state immediately
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    },
    [user]
  );

  const activeConversations = showArchived
    ? conversations.filter((c) => c.is_archived)
    : conversations.filter((c) => !c.is_archived);

  const archivedCount = conversations.filter((c) => c.is_archived).length;

  return {
    conversations: activeConversations,
    allConversations: conversations,
    loading,
    refresh: fetchConversations,
    togglePin,
    toggleArchive,
    toggleMute,
    deleteConversation,
    showArchived,
    setShowArchived,
    archivedCount,
  };
}

// --- Unread count ---
export function useTotalUnread() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    const { data: participations } = await fromTable("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations?.length) {
      setCount(0);
      return;
    }

    const convIds = participations.map((p: any) => p.conversation_id);
    const { count: unread } = await fromTable("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("is_read", false)
      .is("deleted_at", null)
      .neq("sender_id", user.id);

    setCount(unread || 0);
  }, [user]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  return count;
}

// --- Chat messages with pagination + offline queue ---
export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const oldestRef = useRef<string | null>(null);
  const isOnline = useConnectionStatus();

  // Load pending from queue on mount
  useEffect(() => {
    if (!conversationId) return;
    const queue = getOfflineQueue().filter(
      (m) => (m as any).conversationId === conversationId
    );
    setPendingMessages(queue);
  }, [conversationId]);

  // Flush offline queue when back online
  useEffect(() => {
    if (!isOnline || !user || !conversationId) return;
    const queue = getOfflineQueue();
    const forThisConv = queue.filter((m) => (m as any).conversationId === conversationId);
    if (forThisConv.length === 0) return;

    const flush = async () => {
      for (const pending of forThisConv) {
        setPendingMessages((prev) =>
          prev.map((m) => (m.id === pending.id ? { ...m, status: "sending" as const } : m))
        );
        const { data, error } = await fromTable("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message_text: pending.text,
          reply_to_id: pending.replyToId || null,
          message_type: pending.messageType,
          metadata: pending.metadata || null,
        }).select("*").single();
        if (!error && data) {
          removeFromQueue(pending.id);
          setPendingMessages((prev) => prev.filter((m) => m.id !== pending.id));
          setMessages((prev) => upsertMessage(prev, data as Message));
        } else {
          setPendingMessages((prev) =>
            prev.map((m) => (m.id === pending.id ? { ...m, status: "failed" as const } : m))
          );
        }
      }
    };
    flush();
  }, [isOnline, user, conversationId]);

  const fetchMessages = useCallback(
    async (before?: string) => {
      if (!conversationId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      let query = fromTable("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(MESSAGES_PAGE_SIZE);

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data } = await query;
      const msgs = ((data as Message[]) || []).reverse();

      if (before) {
        setMessages((prev) => dedupeMessages([...msgs, ...prev]));
      } else {
        setMessages((prev) => mergeFetchedMessages(prev, msgs));
      }

      setHasMore((data?.length || 0) >= MESSAGES_PAGE_SIZE);
      if (msgs.length > 0) {
        oldestRef.current = msgs[0].created_at;
      }
      setLoading(false);

      if (user && !before) {
        await fromTable("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .eq("is_read", false)
          .neq("sender_id", user.id);
      }
    },
    [conversationId, user]
  );

  const loadMore = useCallback(() => {
    if (oldestRef.current && hasMore) {
      fetchMessages(oldestRef.current);
    }
  }, [fetchMessages, hasMore]);

  useEffect(() => {
    oldestRef.current = null;
    fetchMessages();
  }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channelName = `chat-${conversationId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => upsertMessage(prev, newMsg));
          if (user && newMsg.sender_id !== user.id) {
            fromTable("messages").update({ is_read: true }).eq("id", newMsg.id).then();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => upsertMessage(prev, updated));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const deleted = payload.old as any;
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Fallback: refetch messages on subscription error
          setTimeout(() => fetchMessages(), 1000);
        }
      });

    // Visibility change handler - refetch when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [conversationId, user]);

  // --- Send with optional reply + offline support + optimistic UI ---
  const sendMessage = useCallback(
    async (text: string, replyToId?: string, messageType: string = "text", metadata?: any) => {
      if (!conversationId || !user || (!text.trim() && messageType === "text")) return;

      // Clear draft
      saveDraft(conversationId, "");

      const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const cleanText = text.trim();
      const optimisticMetadata = attachClientTempId(metadata, optimisticId);

      if (!navigator.onLine) {
        // Queue for offline
        const pending: PendingMessage = {
          id: optimisticId,
          text: cleanText,
          replyToId,
          messageType,
          metadata: optimisticMetadata,
          status: "pending",
          timestamp: Date.now(),
          conversationId,
        };
        addToQueue(pending);
        setPendingMessages((prev) => [...prev, pending]);
        return;
      }

      // Optimistic: show message immediately in chat
      const optimisticMsg: Message = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: user.id,
        message_text: cleanText,
        created_at: new Date().toISOString(),
        is_read: false,
        edited_at: null,
        deleted_at: null,
        reply_to_id: replyToId || null,
        forwarded_from_id: null,
        message_type: messageType,
        metadata: optimisticMetadata,
        client_status: "sending",
      };
      setMessages((prev) => dedupeMessages([...prev, optimisticMsg]));

      const { data, error } = await fromTable("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_text: cleanText,
        reply_to_id: replyToId || null,
        message_type: messageType,
        metadata: optimisticMetadata,
      }).select("*").single();

      if (error) {
        // Remove optimistic message, add to pending with failed status
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        const failedPending: PendingMessage = {
          id: optimisticId,
          text: cleanText,
          replyToId,
          messageType,
          metadata: optimisticMetadata,
          status: "failed",
          timestamp: Date.now(),
          conversationId,
        };
        setPendingMessages((prev) => [...prev.filter((m) => m.id !== optimisticId), failedPending]);
      } else if (data) {
        setMessages((prev) => upsertMessage(prev, data as Message));
      }
    },
    [conversationId, user]
  );

  // --- Retry failed message ---
  const retryMessage = useCallback(
    async (pendingId: string) => {
      if (!conversationId || !user) return;
      const pending = pendingMessages.find((m) => m.id === pendingId);
      if (!pending) return;

      setPendingMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, status: "sending" as const } : m))
      );

      const { data, error } = await fromTable("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_text: pending.text,
        reply_to_id: pending.replyToId || null,
        message_type: pending.messageType,
        metadata: pending.metadata || null,
      }).select("*").single();

      if (!error && data) {
        removeFromQueue(pendingId);
        setPendingMessages((prev) => prev.filter((m) => m.id !== pendingId));
        setMessages((prev) => upsertMessage(prev, data as Message));
      } else {
        setPendingMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, status: "failed" as const } : m))
        );
      }
    },
    [conversationId, user, pendingMessages]
  );

  // --- Forward message to another conversation ---
  const forwardMessage = useCallback(
    async (messageId: string, targetConversationId: string) => {
      if (!user) return false;
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return false;
      const { error } = await fromTable("messages").insert({
        conversation_id: targetConversationId,
        sender_id: user.id,
        message_text: msg.message_text,
        forwarded_from_id: messageId,
        message_type: msg.message_type,
        metadata: msg.metadata,
      });
      return !error;
    },
    [user, messages]
  );

  // --- Edit (within 15 minutes) ---
  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!user || !newText.trim()) return false;
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.sender_id !== user.id) return false;
      if (Date.now() - new Date(msg.created_at).getTime() > 15 * 60 * 1000) return false;
      const { error } = await fromTable("messages")
        .update({ message_text: newText.trim(), edited_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", user.id);
      return !error;
    },
    [user, messages]
  );

  // --- Delete for everyone ---
  const deleteForEveryone = useCallback(
    async (messageId: string) => {
      if (!user) return false;
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.sender_id !== user.id) return false;
      const { error } = await fromTable("messages")
        .update({ deleted_at: new Date().toISOString(), message_text: "" })
        .eq("id", messageId)
        .eq("sender_id", user.id);
      if (!error) setMessages((prev) => prev.filter((m) => m.id !== messageId));
      return !error;
    },
    [user, messages]
  );

  // --- Delete for me ---
  const deleteForMe = useCallback(
    async (messageId: string) => {
      if (!user) return false;
      const { error } = await fromTable("deleted_messages").insert({
        message_id: messageId,
        user_id: user.id,
      });
      if (!error) setMessages((prev) => prev.filter((m) => m.id !== messageId));
      return !error;
    },
    [user]
  );

  // --- Search within conversation ---
  const searchMessages = useCallback(
    async (query: string): Promise<Message[]> => {
      if (!conversationId || !query.trim()) return [];
      const { data } = await fromTable("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .ilike("message_text", `%${query.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as Message[]) || [];
    },
    [conversationId]
  );

  // --- Report message ---
  const reportMessage = useCallback(
    async (messageId: string, reason: string, description?: string) => {
      if (!user) return false;
      const { error } = await fromTable("message_reports").insert({
        message_id: messageId,
        reporter_id: user.id,
        reason,
        description: description || "",
      });
      return !error;
    },
    [user]
  );

  return {
    messages,
    pendingMessages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    retryMessage,
    forwardMessage,
    editMessage,
    deleteForEveryone,
    deleteForMe,
    searchMessages,
    reportMessage,
  };
}

// --- Typing indicator ---
export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase.channel(`typing-${conversationId}`, {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing = Object.keys(state).filter((uid) => {
          const entries = state[uid] as any[];
          return entries.some((e: any) => e.typing) && uid !== user.id;
        });
        setTypingUsers(typing);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  const setTyping = useCallback((typing: boolean) => {
    if (channelRef.current) channelRef.current.track({ typing });
  }, []);

  return { typingUsers, setTyping };
}

// --- Send booking message ---
export async function sendBookingMessage(conversationId: string, bookingData: {
  booking_id: string;
  service_name: string;
  date: string;
  time: string;
  price: number;
  pet_name?: string;
  status: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await fromTable("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    message_text: `Booking request: ${bookingData.service_name}`,
    message_type: "booking_request",
    metadata: bookingData,
  });
}

// --- Update booking status via chat ---
export async function updateBookingFromChat(bookingId: string, newStatus: string, conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  await fromTable("care_bookings")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  const statusLabels: Record<string, string> = {
    confirmed: "✅ Booking confirmed",
    rejected: "❌ Booking rejected",
    cancelled: "🚫 Booking cancelled",
  };

  await fromTable("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    message_text: statusLabels[newStatus] || `Booking ${newStatus}`,
    message_type: "system",
  });
}

// --- Get or create conversation ---
export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_conversation_with_participant" as any, {
    _other_user_id: otherUserId,
  });
  if (error) throw error;
  return data as string;
}

// --- Activity status label ---
export function getActivityStatus(lastActiveAt: string | null): {
  label: string;
  isOnline: boolean;
} {
  if (!lastActiveAt) return { label: "Offline", isOnline: false };
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  if (diff < 2 * 60 * 1000) return { label: "Online now", isOnline: true };
  if (diff < 60 * 60 * 1000) {
    const mins = Math.floor(diff / 60000);
    return { label: `Active ${mins}m ago`, isOnline: false };
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / 3600000);
    return { label: `Active ${hours}h ago`, isOnline: false };
  }
  return { label: "Offline", isOnline: false };
}
