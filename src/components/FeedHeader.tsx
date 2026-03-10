import petkeepLogo from "@/assets/petkeep-logo.png";
import { Bell } from "lucide-react";

const FeedHeader = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        {/* Left: Logo */}
        <img src={petkeepLogo} alt="PetKeep" className="h-8 w-8 object-contain" />

        {/* Center: Title (absolute centered) */}
        <h1 className="absolute left-1/2 -translate-x-1/2 font-display text-xl font-extrabold text-foreground">
          PetKeep
        </h1>

        {/* Right: Bell */}
        <button className="relative rounded-full p-2 text-foreground transition-colors hover:bg-secondary">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  );
};

export default FeedHeader;
