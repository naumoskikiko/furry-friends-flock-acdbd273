import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  last_message?: {
    message_text: string;
    created_at: string;
    sender_id: string;
    deleted_at: string | null;
  };
  unread_count: number;
  is_pinned: boolean;
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
}

const fromTable = (table: string) => (supabase as any).from(table);

const MESSAGES_PAGE_SIZE = 50;

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
    activityInterval = setInterval(updateActivity, 60000); // every minute

    return () => {
      if (activityInterval) clearInterval(activityInterval);
    };
  }, [user]);
}

// --- Conversations ---
export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: participations } = await fromTable("conversation_participants")
      .select("conversation_id, is_pinned")
      .eq("user_id", user.id);

    if (!participations?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participations.map((p: any) => p.conversation_id);
    const pinMap = new Map(participations.map((p: any) => [p.conversation_id, p.is_pinned]));

    const { data: otherParticipants } = await fromTable("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds)
      .neq("user_id", user.id);

    if (!otherParticipants?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const otherUserIds = [...new Set(otherParticipants.map((p: any) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url, last_active_at" as any)
      .in("user_id", otherUserIds as string[]);

    const profileMap = new Map((profiles as any[])?.map((p: any) => [p.user_id, p]) || []);

    // Fetch deleted_messages for current user
    const { data: deletedMsgs } = await fromTable("deleted_messages")
      .select("message_id")
      .eq("user_id", user.id);
    const deletedSet = new Set((deletedMsgs || []).map((d: any) => d.message_id));

    const convList: Conversation[] = [];

    for (const convId of convIds) {
      const otherP = otherParticipants.find((p: any) => p.conversation_id === convId);
      if (!otherP) continue;
      const profile = profileMap.get(otherP.user_id) as any;
      if (!profile) continue;

      const { data: lastMsg } = await fromTable("messages")
        .select("id, message_text, created_at, sender_id, deleted_at")
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

      convList.push({
        id: convId,
        created_at: lastMsg?.created_at || "",
        other_user: {
          user_id: profile.user_id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          last_active_at: profile.last_active_at || null,
        },
        last_message: lastMsg
          ? {
              message_text: lastMsg.deleted_at ? "This message was deleted" : lastMsg.message_text,
              created_at: lastMsg.created_at,
              sender_id: lastMsg.sender_id,
              deleted_at: lastMsg.deleted_at,
            }
          : undefined,
        unread_count: count || 0,
        is_pinned: pinMap.get(convId) || false,
      });
    }

    // Sort: pinned first, then by last message time
    convList.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const ta = a.last_message?.created_at || a.created_at;
      const tb = b.last_message?.created_at || b.created_at;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });

    setConversations(convList);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversations-refresh")
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

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      // Mark all messages as deleted for this user
      const { data: msgs } = await fromTable("messages")
        .select("id")
        .eq("conversation_id", conversationId);
      if (msgs?.length) {
        const inserts = msgs.map((m: any) => ({ message_id: m.id, user_id: user.id }));
        await fromTable("deleted_messages").upsert(inserts, { onConflict: "message_id,user_id" });
      }
      fetchConversations();
    },
    [user, fetchConversations]
  );

  return { conversations, loading, refresh: fetchConversations, togglePin, deleteConversation };
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

// --- Chat messages with pagination ---
export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const oldestRef = useRef<string | null>(null);

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
        setMessages((prev) => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
      }

      setHasMore((data?.length || 0) >= MESSAGES_PAGE_SIZE);
      if (msgs.length > 0) {
        oldestRef.current = msgs[0].created_at;
      }
      setLoading(false);

      // Mark as read
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
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (user && newMsg.sender_id !== user.id) {
            fromTable("messages").update({ is_read: true }).eq("id", newMsg.id).then();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deleted = payload.old as any;
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // --- Send ---
  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !user || !text.trim()) return;
      await fromTable("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_text: text.trim(),
      });
    },
    [conversationId, user]
  );

  // --- Edit (within 15 minutes) ---
  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!user || !newText.trim()) return false;
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.sender_id !== user.id) return false;

      const sentAt = new Date(msg.created_at).getTime();
      const now = Date.now();
      if (now - sentAt > 15 * 60 * 1000) return false; // 15 minute limit

      const { error } = await fromTable("messages")
        .update({ message_text: newText.trim(), edited_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", user.id);

      return !error;
    },
    [user, messages]
  );

  // --- Delete for everyone (sender only) ---
  const deleteForEveryone = useCallback(
    async (messageId: string) => {
      if (!user) return false;
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.sender_id !== user.id) return false;

      const { error } = await fromTable("messages")
        .update({ deleted_at: new Date().toISOString(), message_text: "" })
        .eq("id", messageId)
        .eq("sender_id", user.id);

      if (!error) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
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
      if (!error) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
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
    loading,
    hasMore,
    loadMore,
    sendMessage,
    editMessage,
    deleteForEveryone,
    deleteForMe,
    searchMessages,
    reportMessage,
  };
}

// --- Typing indicator (presence-based, no DB needed) ---
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

  const setTyping = useCallback(
    (typing: boolean) => {
      if (channelRef.current) {
        channelRef.current.track({ typing });
      }
    },
    []
  );

  return { typingUsers, setTyping };
}

// --- Get or create conversation ---
export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_conversation_with_participant" as any, {
    _other_user_id: otherUserId,
  });
  if (error) throw error;
  return data as string;
}

// --- Get activity status label ---
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
