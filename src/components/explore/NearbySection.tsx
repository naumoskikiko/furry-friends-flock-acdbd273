import { useState } from "react";
import { MapPin, Star, ChevronRight, ChevronDown } from "lucide-react";

export interface NearbyItem {
  id: string;
  name: string;
  type: string;
  distance: string;
  rating: number;
  emoji: string;
}

interface NearbySectionProps {
  title: string;
  items: NearbyItem[];
  onItemClick?: (item: NearbyItem) => void;
}

const NearbySection = ({ title, items, onItemClick }: NearbySectionProps) => {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-4">
        <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-0.5 text-xs font-semibold text-primary"
        >
          {expanded ? "Show less" : "See all"}
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      </div>

      {!expanded ? (
        <div className="mt-2 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClick={() => onItemClick?.(item)} />
          ))}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3 px-4 pb-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClick={() => onItemClick?.(item)} />
          ))}
        </div>
      )}
    </div>
  );
};

const ItemCard = ({ item, onClick }: { item: NearbyItem; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex min-w-[160px] flex-col gap-2 rounded-2xl bg-card p-3 petkeep-card-shadow petkeep-card-hover text-left transition-transform active:scale-[0.97]"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-lg">
      {item.emoji}
    </div>
    <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-0.5">
        <Star className="h-3 w-3 fill-petkeep-orange text-petkeep-orange" />
        {item.rating}
      </span>
      <span className="flex items-center gap-0.5">
        <MapPin className="h-3 w-3" />
        {item.distance}
      </span>
    </div>
  </button>
);

export default NearbySection;
