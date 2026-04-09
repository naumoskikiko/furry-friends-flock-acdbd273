import { useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useNotifications, NotificationData } from "@/hooks/useNotifications";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import {
  ArrowLeft, Bell, Check, Heart, MessageCircle, UserPlus, Bookmark,
  Newspaper, ShoppingBag, CalendarCheck, PawPrint, MapPin, Shield, Package, Star, AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* ── Filter pill definitions ── */
const FILTER_PILLS = [
  { key: "all", label: "All", icon: null },
  { key: "social", label: "Social", icon: <Heart className="h-3.5 w-3.5" /> },
  { key: "messages", label: "Messages", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { key: "orders", label: "Orders", icon: <Package className="h-3.5 w-3.5" /> },
  { key: "bookings", label: "Bookings", icon: <CalendarCheck className="h-3.5 w-3.5" /> },
  { key: "petmatch", label: "PetMatch", icon: <PawPrint className="h-3.5 w-3.5" /> },
  { key: "tracking", label: "Tracking", icon: <MapPin className="h-3.5 w-3.5" /> },
  { key: "system", label: "System", icon: <Shield className="h-3.5 w-3.5" /> },
] as const;

type FilterKey = (typeof FILTER_PILLS)[number]["key"];

const TYPE_TO_FILTER: Record<string, FilterKey> = {
  like: "social", comment: "social", follow: "social", mention: "social", save: "social",
  blog_like: "social", blog_comment: "social", blog_save: "social",
  message: "messages", message_request: "messages",
  order: "orders", order_update: "orders", product_liked: "orders", product_review: "orders",
  booking: "bookings", booking_accepted: "bookings", booking_rejected: "bookings", booking_reminder: "bookings",
  petmatch: "petmatch", petmatch_message: "petmatch", adoption_inquiry: "petmatch",
  safe_zone_exit: "tracking", safe_zone_return: "tracking",
  report_update: "system", account_action: "system", subscription_expiring: "system", system: "system",
  helpful_answer: "social",
};

/* ── Notification icon ── */
const notificationIcon = (type: string) => {
  switch (type) {
    case "like":
    case "blog_like":
    case "product_liked":
      return <Heart className="h-4 w-4 text-primary fill-primary" />;
    case "comment":
    case "blog_comment":
      return <MessageCircle className="h-4 w-4 text-accent" />;
    case "follow":
      return <UserPlus className="h-4 w-4 text-petkeep-mint" />;
    case "save":
    case "blog_save":
      return <Bookmark className="h-4 w-4 text-foreground fill-foreground" />;
    case "message":
    case "message_request":
    case "petmatch_message":
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case "order":
    case "order_update":
      return <Package className="h-4 w-4 text-accent" />;
    case "booking":
    case "booking_accepted":
    case "booking_rejected":
    case "booking_reminder":
      return <CalendarCheck className="h-4 w-4 text-petkeep-mint" />;
    case "petmatch":
    case "adoption_inquiry":
      return <PawPrint className="h-4 w-4 text-primary" />;
    case "safe_zone_exit":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "safe_zone_return":
      return <MapPin className="h-4 w-4 text-petkeep-green" />;
    case "product_review":
    case "helpful_answer":
      return <Star className="h-4 w-4 text-yellow-500" />;
    case "report_update":
    case "account_action":
    case "subscription_expiring":
    case "system":
      return <Shield className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

/* ── Deep-link navigation ── */
const getNotificationRoute = (n: NotificationData): string => {
  switch (n.entity_type) {
    case "post":
      return n.entity_id ? `/post/${n.entity_id}` : "/";
    case "profile":
      return `/user/${n.actor_id}`;
    case "blog":
      return "/";
    case "message":
      return "/messages";
    case "booking":
      return "/care";
    case "order":
      return "/orders";
    case "product":
      return n.entity_id ? `/product/${n.entity_id}` : "/marketplace";
    case "petmatch":
      return "/care";
    case "tracker":
      return "/find-my-pet";
    default:
      if (n.type === "follow") return `/user/${n.actor_id}`;
      return "/";
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAllRead, markRead, refresh } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const pillsRef = useRef<HTMLDivElement>(null);

  const { refreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: useCallback(async () => {
      await refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, [refresh]) });

  /* ── Filter logic ── */
  const filtered = activeFilter === "all"
    ? notifications
    : notifications.filter((n) => (TYPE_TO_FILTER[n.type] || "system") === activeFilter);

  /* ── Group by today / earlier ── */
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = filtered.filter((n) => new Date(n.created_at) >= todayStart);
  const earlier = filtered.filter((n) => new Date(n.created_at) < todayStart);

  /* ── Pill counts ── */
  const countByFilter = (key: FilterKey) =>
    key === "all"
      ? notifications.filter((n) => !n.is_read).length
      : notifications.filter((n) => !n.is_read && (TYPE_TO_FILTER[n.type] || "system") === key).length;

  const handleTap = (n: NotificationData) => {
    if (!n.is_read) markRead(n.id);
    navigate(getNotificationRoute(n));
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

        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-bold">{n.actor_name}</span>{" "}
            <span className="text-muted-foreground">{n.message}</span>
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo}</p>
        </div>

        {!n.is_read && (
          <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
        )}
      </button>
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <PullToRefreshIndicator refreshing={refreshing} pullDistance={pullDistance} />

        {/* Header */}
        <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
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

          {/* Filter Pills */}
          <div
            ref={pillsRef}
            className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide"
          >
            {FILTER_PILLS.map((pill) => {
              const unread = countByFilter(pill.key);
              const isActive = activeFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setActiveFilter(pill.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? "petkeep-gradient text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {pill.icon}
                  {pill.label}
                  {unread > 0 && (
                    <span className={`ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-display font-bold">
              {activeFilter === "all" ? "No notifications yet" : `No ${activeFilter} notifications`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeFilter === "all"
                ? "When someone interacts with your posts, you'll see it here"
                : "Try selecting a different filter"}
            </p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Today</p>
                {today.map(renderNotification)}
              </div>
            )}
            {earlier.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Earlier</p>
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
