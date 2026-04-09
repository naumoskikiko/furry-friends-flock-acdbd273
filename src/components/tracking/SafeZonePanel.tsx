import { useState } from "react";
import { SafeZone } from "@/hooks/useTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Props {
  zones: SafeZone[];
  onAdd: (zone: { name: string; center_lat: number; center_lng: number; radius: number }) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onClose: () => void;
  mapCenter: [number, number];
}

const RADIUS_OPTIONS = [
  { label: "50m", value: 50 },
  { label: "100m", value: 100 },
  { label: "250m", value: 250 },
  { label: "500m", value: 500 },
  { label: "1km", value: 1000 },
  { label: "2km", value: 2000 },
];

const SafeZonePanel = ({ zones, onAdd, onRemove, onToggle, onClose, mapCenter }: Props) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("Home");
  const [radius, setRadius] = useState(500);

  const handleAdd = () => {
    onAdd({ name: name.trim() || "Safe Zone", center_lat: mapCenter[0], center_lng: mapCenter[1], radius });
    setAdding(false);
    setName("Home");
    setRadius(500);
  };

  return (
    <div className="bg-card border-t border-border p-4 space-y-3 z-20 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-bold">Safe Zones</h3>
        </div>
        <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg bg-secondary">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {zones.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No safe zones yet. Add one to get alerts when your pet leaves.
        </p>
      )}

      {zones.map((z) => (
        <div key={z.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{z.name}</p>
            <p className="text-[10px] text-muted-foreground">{z.radius}m radius</p>
          </div>
          <Switch checked={z.is_active} onCheckedChange={(v) => onToggle(z.id, v)} />
          <button onClick={() => onRemove(z.id)} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-xl bg-secondary/30 p-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zone name"
            className="rounded-lg h-9 text-sm"
          />
          <div className="flex gap-1.5 flex-wrap">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRadius(r.value)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  radius === r.value
                    ? "petkeep-gradient text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Zone will be centered on pet's current location</p>
          <div className="flex gap-2">
            <Button onClick={handleAdd} size="sm" className="flex-1 rounded-lg petkeep-gradient">Add Zone</Button>
            <Button onClick={() => setAdding(false)} variant="secondary" size="sm" className="rounded-lg">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setAdding(true)} variant="secondary" size="sm" className="w-full rounded-xl gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Safe Zone
        </Button>
      )}
    </div>
  );
};

export default SafeZonePanel;
