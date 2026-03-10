import { Home, Map, ShoppingBag, Heart, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTotalUnread } from "@/hooks/useMessages";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Map, label: "Explore" },
  { path: "/marketplace", icon: ShoppingBag, label: "Market" },
  { path: "/care", icon: Heart, label: "Care" },
  { path: "/messages", icon: MessageCircle, label: "Chat" },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useTotalUnread();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showBadge = path === "/messages" && unreadCount > 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              {showBadge && (
                <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
