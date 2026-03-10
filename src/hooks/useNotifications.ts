import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationData {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  entity_type: string;
  entity_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  // enriched
  actor_name: string;
  actor_avatar: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const enrichNotifications = useCallback(async (raw: any[]): Promise<NotificationData[]> => {
    if (raw.length === 0) return [];
    const actorIds = [...new Set(raw.map((n) => n.actor_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", actorIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    return raw.map((n) => {
      const actor = profileMap.get(n.actor_id);
      return {
        ...n,
        actor_name: actor?.full_name || "Someone",
        actor_avatar: actor?.avatar_url || null,
      };
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const enriched = await enrichNotifications(data || []);
    setNotifications(enriched);
    setUnreadCount(enriched.filter((n) => !n.is_read).length);
    setLoading(false);
  }, [user, enrichNotifications]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  const markRead = useCallback(async (notificationId: string) => {
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const enriched = await enrichNotifications([payload.new]);
          if (enriched.length > 0) {
            setNotifications((prev) => [enriched[0], ...prev]);
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enrichNotifications]);

  return { notifications, unreadCount, loading, markAllRead, markRead, refresh: fetchNotifications };
};

// Helper to create a notification
export const createNotification = async (
  actorId: string,
  userId: string,
  type: string,
  entityType: string,
  entityId: string | null,
  message: string
) => {
  // Don't notify yourself
  if (actorId === userId) return;
  await (supabase as any).from("notifications").insert({
    user_id: userId,
    actor_id: actorId,
    type,
    entity_type: entityType,
    entity_id: entityId,
    message,
  });
};
