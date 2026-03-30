import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useNotifications, NotificationData } from "@/hooks/useNotifications";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { ArrowLeft, Bell, Check, Heart, MessageCircle, UserPlus, Bookmark, Newspaper, ShoppingBag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const notificationIcon = (type: string) => {
  switch (type) {
    case "like": return <Heart className="h-4 w-4 text-primary fill-primary" />;
    case "comment": return <MessageCircle className="h-4 w-4 text-accent" />;
    case "follow": return <UserPlus className="h-4 w-4 text-petkeep-mint" />;
    case "save": return <Bookmark className="h-4 w-4 text-foreground fill-foreground" />;
    case "blog_like":
    case "blog_comment":
    case "blog_save": return <Newspaper className="h-4 w-4 text-primary" />;
    case "booking":
    case "order": return <ShoppingBag className="h-4 w-4 text-accent" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAllRead, markRead, refresh } = useNotifications();

  const { refreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: useCallback(async () => {
      await refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, [refresh]) });

  // Group by today / earlier
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const today = notifications.filter((n) => new Date(n.created_at) >= todayStart);
  const earlier = notifications.filter((n) => new Date(n.created_at) < todayStart);

  const handleTap = (n: NotificationData) => {
    if (!n.is_read) markRead(n.id);
    // Navigate based on entity_type
    if (n.entity_type === "post" && n.entity_id) {
      navigate("/");
    } else if (n.entity_type === "profile" || n.type === "follow") {
      navigate(`/user/${n.actor_id}`);
    } else if (n.entity_type === "blog" && n.entity_id) {
      navigate("/");
    } else if (n.entity_type === "message") {
      navigate("/messages");
    } else if (n.entity_type === "booking" || n.entity_type === "order") {
      navigate("/marketplace");
    }
  };

  const handleActorTap = (e: React.MouseEvent, actorId: string) => {
    e.stopPropagation();
    navigate(`/user/${actorId}`);
  };

  const renderNotification = (n: NotificationData) => {
    const initials = n.actor_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

    return (
      <button
        key={n.id}
        onClick={() => handleTap(n)}
        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 ${
          !n.is_read ? "bg-primary/5" : ""
        }`}
      >
        {/* Actor avatar */}
        <button onClick={(e) => handleActorTap(e, n.actor_id)} className="relative shrink-0">
          {n.actor_avatar ? (
            <img src={n.actor_avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-petkeep-orange-light font-display text-xs font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-card shadow-sm">
            {notificationIcon(n.type)}
          </div>
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-bold">{n.actor_name}</span>{" "}
            <span className="text-muted-foreground">{n.message}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo}</p>
        </div>

        {/* Unread dot */}
        {!n.is_read && (
          <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
        )}
      </button>
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-extrabold">Notifications</h1>
          <button
            onClick={markAllRead}
            className="rounded-full p-2 text-primary hover:bg-secondary"
            title="Mark all as read"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-display font-bold">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When someone interacts with your posts, you'll see it here
            </p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Today
                </p>
                {today.map(renderNotification)}
              </div>
            )}

            {earlier.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Earlier
                </p>
                {earlier.map(renderNotification)}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default NotificationsPage;
