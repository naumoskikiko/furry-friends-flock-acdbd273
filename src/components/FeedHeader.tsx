import { useNavigate } from "react-router-dom";
import petkeepLogo from "@/assets/petkeep-logo.png";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const FeedHeader = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-lg items-center justify-center px-4 py-3">
        {/* Center: Logo + Title */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg petkeep-gradient">
            <PawPrint className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-extrabold text-foreground">PetKeep</h1>
        </div>

        {/* Right: Bell with badge */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative rounded-full p-2 text-foreground transition-colors hover:bg-secondary"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default FeedHeader;
