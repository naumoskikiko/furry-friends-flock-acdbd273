import { useState, useEffect, useCallback } from "react";
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
  };
  last_message?: {
    message_text: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  is_read: boolean;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = participations.map((p) => p.conversation_id);

    const { data: otherParticipants } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds)
      .neq("user_id", user.id);

    if (!otherParticipants?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const otherUserIds = [...new Set(otherParticipants.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .in("user_id", otherUserIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const convList: Conversation[] = [];

    for (const convId of convIds) {
      const otherP = otherParticipants.find((p) => p.conversation_id === convId);
      if (!otherP) continue;
      const profile = profileMap.get(otherP.user_id);
      if (!profile) continue;

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("message_text, created_at, sender_id")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      convList.push({
        id: convId,
        created_at: lastMsg?.created_at || "",
        other_user: {
          user_id: profile.user_id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        },
        last_message: lastMsg || undefined,
        unread_count: count || 0,
      });
    }

    convList.sort((a, b) => {
      const ta = a.last_message?.created_at || a.created_at;
      const tb = b.last_message?.created_at || b.created_at;
      return new Date(tb).getTime() - new Date(ta).getTime();
    });

    setConversations(convList);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversations-refresh")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  return { conversations, loading, refresh: fetchConversations };
}

export function useTotalUnread() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations?.length) { setCount(0); return; }

    const convIds = participations.map((p) => p.conversation_id);
    const { count: unread } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    setCount(unread || 0);
  }, [user]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-count")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchCount]);

  return count;
}

export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setMessages([]); setLoading(false); return; }

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages((data as Message[]) || []);
    setLoading(false);

    if (user) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("is_read", false)
        .neq("sender_id", user.id);
    }
  }, [conversationId, user]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        if (user && newMsg.sender_id !== user.id) {
          supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id).then();
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => prev.map((m) => m.id === (payload.new as Message).id ? payload.new as Message : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId || !user || !text.trim()) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_text: text.trim(),
    });
  }, [conversationId, user]);

  return { messages, loading, sendMessage };
}

export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_conversation_with_participant", {
    _other_user_id: otherUserId,
  });
  if (error) throw error;
  return data as string;
}
