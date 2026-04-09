import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((reg) => console.log("SW registered:", reg.scope))
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  // Listen to foreground messages
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      toast({
        title: title || "💊 Medication Reminder",
        description: body || "Time to give medication!",
      });
    }).then((unsub) => {
      if (typeof unsub === "function") unsubscribe = unsub;
    });
    return () => unsubscribe?.();
  }, [toast]);

  const saveToken = useCallback(
    async (token: string) => {
      if (!user) return;
      const deviceInfo = navigator.userAgent.slice(0, 100);
      await (supabase as any)
        .from("push_tokens")
        .upsert(
          { user_id: user.id, fcm_token: token, device_info: deviceInfo },
          { onConflict: "user_id,fcm_token" }
        );
    },
    [user]
  );

  const enablePush = useCallback(async () => {
    setLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setFcmToken(token);
        setPermissionStatus("granted");
        await saveToken(token);
        toast({ title: "Push notifications enabled! 🔔" });
      } else {
        setPermissionStatus(Notification.permission);
        if (Notification.permission === "denied") {
          toast({
            title: "Notifications blocked",
            description: "Please enable notifications in your browser settings.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error("Push enable error:", err);
    }
    setLoading(false);
  }, [saveToken, toast]);

  // Auto-register if already granted
  useEffect(() => {
    if (user && permissionStatus === "granted" && !fcmToken) {
      enablePush();
    }
  }, [user, permissionStatus, fcmToken, enablePush]);

  return { permissionStatus, fcmToken, enablePush, loading };
};
