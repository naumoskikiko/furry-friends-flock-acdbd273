import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Slim banner that appears at the top of the screen when the device drops
 * offline. Auto-hides on reconnect.
 *
 * Sits above headers (z-50) and respects iOS safe-area so it never tucks
 * under the notch. Renders nothing while online → zero layout cost.
 */
const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 safe-top bg-destructive text-destructive-foreground"
    >
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium">
        <WifiOff className="h-3.5 w-3.5" />
        <span>You're offline — some actions will retry when you reconnect.</span>
      </div>
    </div>
  );
};

export default OfflineBanner;
