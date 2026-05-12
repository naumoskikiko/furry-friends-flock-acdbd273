import { USE_LOVABLE_CLOUD } from "@/config/cloudFlag";

/**
 * Tiny fixed banner shown when Lovable Cloud is disabled, so the app feels
 * intentional (rather than broken) while running with no backend.
 * Hidden entirely when USE_LOVABLE_CLOUD = true.
 */
const CloudDisabledBanner = () => {
  if (USE_LOVABLE_CLOUD) return null;
  return (
    <div
      role="status"
      className="fixed bottom-2 left-1/2 z-[9999] -translate-x-1/2 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-[10px] font-medium text-muted-foreground shadow-md backdrop-blur"
    >
      Offline mode · Cloud disabled
    </div>
  );
};

export default CloudDisabledBanner;
