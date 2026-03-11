import { Zap } from "lucide-react";

interface BoostBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

const BoostBadge = ({ size = "sm", className = "" }: BoostBadgeProps) => {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 text-white font-bold ${
        size === "sm" ? "text-[8px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"
      } ${className}`}
    >
      <Zap className={size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"} fill="currentColor" />
      Promoted
    </span>
  );
};

export default BoostBadge;
