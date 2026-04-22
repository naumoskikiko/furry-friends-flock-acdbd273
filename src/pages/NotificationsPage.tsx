import { useCallback, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useNotifications, NotificationData } from "@/hooks/useNotifications";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/PullToRefreshIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Bell, Check, Heart, MessageCircle, UserPlus, Bookmark,
  Newspaper, ShoppingBag, CalendarCheck, PawPrint, MapPin, Shield, Package, Star, AlertTriangle,
  UserCheck, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

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

type FilterKey = (typeof FILTER_PILLS)[number]["key"] | string;

const TYPE_TO_FILTER: Record<string, FilterKey> = {
  like: "social", comment: "social", follow: "social", follow_request: "social", mention: "social", save: "social",
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
    case "follow_request":
      return <UserPlus className="h-4 w-4 text-primary" />;
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
      if (n.type === "follow" || n.type === "follow_request") return `/user/${n.actor_id}`;
      return "/";
  }
};

const FILTER_KEY_TO_LABEL: Record<string, string> = {
  Social: "social", Messages: "messages", Orders: "orders",
  Bookings: "bookings", PetMatch: "petmatch", Tracking: "tracking", System: "system",
};

interface CustomFilter { name: string; types: string[] }

interface FollowRequestItem {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  requester_name: string;
  requester_username: string | null;
  requester_avatar: string | null;
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { notifications, loading, markAllRead, markRead, refresh } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const pillsRef = useRef<HTMLDivElement>(null);

  // Follow requests
  const [followRequests, setFollowRequests] = useState<FollowRequestItem[]>([]);
  const [followRequestsExpanded, setFollowRequestsExpanded] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Load custom filters from localStorage (shared with settings)
  const [customFilters] = useState<CustomFilter[]>(() => {
    try { return JSON.parse(localStorage.getItem("petkeep_custom_notif_filters") || "[]"); } catch { return []; }
  });

  const { refreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } =
    usePullToRefresh({ onRefresh: useCallback(async () => {
      await refresh();
      await fetchFollowRequests();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, [refresh]) });

  // Fetch follow requests
  const fetchFollowRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("follow_requests")
      .select("*")
      .eq("target_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setFollowRequests([]);
      return;
    }

    const requesterIds = data.map(r => r.requester_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .in("user_id", requesterIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setFollowRequests(data.map(r => {
      const p = profileMap.get(r.requester_id);
      return {
        id: r.id,
        requester_id: r.requester_id,
        status: r.status,
        created_at: r.created_at,
        requester_name: p?.full_name || "User",
        requester_username: p?.username || null,
        requester_avatar: p?.avatar_url || null,
      };
    }));
  }, [user]);

  useEffect(() => { fetchFollowRequests(); }, [fetchFollowRequests]);

  const handleAccept = async (req: FollowRequestItem) => {
    if (!user) return;
    setProcessingIds(prev => new Set(prev).add(req.id));
    try {
      // Add as follower
      await supabase.from("followers").insert({ follower_id: req.requester_id, following_id: user.id });
      // Update request status
      await supabase.from("follow_requests").update({ status: "accepted" }).eq("id", req.id);
      // Remove from list
      setFollowRequests(prev => prev.filter(r => r.id !== req.id));
      toast({ title: `${req.requester_name} can now follow you` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(req.id); return s; });
    }
  };

  const handleDecline = async (req: FollowRequestItem) => {
    setProcessingIds(prev => new Set(prev).add(req.id));
    try {
      await supabase.from("follow_requests").update({ status: "rejected" }).eq("id", req.id);
      setFollowRequests(prev => prev.filter(r => r.id !== req.id));
      toast({ title: "Request declined" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(req.id); return s; });
    }
  };

  /* ── Filter logic ── */
  const matchesFilter = useCallback((n: NotificationData, filterKey: string): boolean => {
    if (filterKey === "all") return true;
    const builtIn = FILTER_PILLS.find(p => p.key === filterKey);
    if (builtIn) return (TYPE_TO_FILTER[n.type] || "system") === filterKey;
    const custom = customFilters.find(f => f.name === filterKey);
    if (custom) {
      const notifCategory = TYPE_TO_FILTER[n.type] || "system";
      return custom.types.some(t => FILTER_KEY_TO_LABEL[t] === notifCategory);
    }
    return false;
  }, [customFilters]);

  // Filter out follow_request type from regular notifications (shown in dedicated section)
  const regularNotifications = notifications.filter(n => n.type !== "follow_request");
  const filtered = regularNotifications.filter(n => matchesFilter(n, activeFilter));

  /* ── Smart grouping ── */
  const groupSimilar = (items: NotificationData[]): (NotificationData & { groupCount?: number; groupActors?: string[] })[] => {
    const grouped: (NotificationData & { groupCount?: number; groupActors?: string[] })[] = [];
    const seen = new Set<string>();

    for (const n of items) {
      if (seen.has(n.id)) continue;
      if ((n.type === "like" || n.type === "blog_like" || n.type === "product_liked") && n.entity_id) {
        const similar = items.filter(
          o => o.type === n.type && o.entity_id === n.entity_id && !seen.has(o.id)
        );
        if (similar.length > 1) {
          similar.forEach(s => seen.add(s.id));
          const actors = [...new Set(similar.map(s => s.actor_name))];
          grouped.push({
            ...similar[0],
            groupCount: similar.length,
            groupActors: actors,
            message: actors.length <= 2
              ? `${actors.join(" and ")} liked your ${n.entity_type || "post"}`
              : `${actors[0]} and ${similar.length - 1} others liked your ${n.entity_type || "post"}`,
            is_read: similar.every(s => s.is_read),
          });
          continue;
        }
      }
      seen.add(n.id);
      grouped.push(n);
    }
    return grouped;
  };

  /* ── Group by today / earlier ── */
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = groupSimilar(filtered.filter((n) => new Date(n.created_at) >= todayStart));
  const earlier = groupSimilar(filtered.filter((n) => new Date(n.created_at) < todayStart));

  /* ── Pill counts ── */
  const countByFilter = (key: string) =>
    regularNotifications.filter((n) => !n.is_read && matchesFilter(n, key)).length;

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
            <img src={n.actor_avatar} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" decoding="async" />
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
            <h1 className="font-display text-lg font-extrabold">{t("notifications.title")}</h1>
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

        {/* Follow Requests Section */}
        {followRequests.length > 0 && (activeFilter === "all" || activeFilter === "social") && (
          <div className="border-b border-border">
            <button
              onClick={() => setFollowRequestsExpanded(!followRequestsExpanded)}
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Follow Requests</p>
                  <p className="text-[10px] text-muted-foreground">{followRequests.length} pending</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {followRequests.length}
                </span>
                {followRequestsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {followRequestsExpanded && (
              <div className="px-4 pb-3 space-y-2">
                {followRequests.map(req => {
                  const initials = req.requester_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                  const isProcessing = processingIds.has(req.id);
                  const timeAgo = formatDistanceToNow(new Date(req.created_at), { addSuffix: true });

                  return (
                    <div key={req.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                      <button onClick={() => navigate(`/user/${req.requester_username || req.requester_id}`)} className="shrink-0">
                        {req.requester_avatar ? (
                          <img src={req.requester_avatar} alt="" className="h-11 w-11 rounded-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-xs font-bold text-primary-foreground">
                            {initials}
                          </div>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <button onClick={() => navigate(`/user/${req.requester_username || req.requester_id}`)} className="text-left">
                          <p className="text-sm font-bold truncate">{req.requester_name}</p>
                          <p className="text-[10px] text-muted-foreground">@{req.requester_username || req.requester_id.slice(0, 8)} · {timeAgo}</p>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs font-bold rounded-xl"
                          onClick={() => handleAccept(req)}
                          disabled={isProcessing}
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-xl"
                          onClick={() => handleDecline(req)}
                          disabled={isProcessing}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : filtered.length === 0 && followRequests.length === 0 ? (
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
