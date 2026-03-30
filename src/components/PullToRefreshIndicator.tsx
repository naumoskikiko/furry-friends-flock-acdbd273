import { Loader2 } from "lucide-react";

interface Props {
  refreshing: boolean;
  pullDistance: number;
}

const PullToRefreshIndicator = ({ refreshing, pullDistance }: Props) => {
  if (!refreshing && pullDistance <= 0) return null;

  return (
    <div
      className="flex justify-center overflow-hidden transition-all duration-200"
      style={{ height: refreshing ? 48 : pullDistance }}
    >
      <div className="flex items-center justify-center py-2">
        <Loader2
          className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={{
            opacity: refreshing ? 1 : Math.min(pullDistance / 40, 1),
            transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)`,
          }}
        />
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
