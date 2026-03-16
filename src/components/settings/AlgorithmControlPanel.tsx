import { useState } from "react";
import { Sliders, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WeightConfig {
  rating: number;
  orders: number;
  engagement: number;
  productPopularity: number;
  recency: number;
  verifiedBonus: number;
  randomization: number;
  boostMultiplier24h: number;
  boostMultiplier3d: number;
  boostMultiplier7d: number;
  boostMultiplier30d: number;
}

const DEFAULT_WEIGHTS: WeightConfig = {
  rating: 0.25,
  orders: 0.20,
  engagement: 0.15,
  productPopularity: 0.15,
  recency: 0.10,
  verifiedBonus: 0.05,
  randomization: 0.05,
  boostMultiplier24h: 1.2,
  boostMultiplier3d: 1.35,
  boostMultiplier7d: 1.5,
  boostMultiplier30d: 1.8,
};

const STORAGE_KEY = "petkeep_algorithm_weights";

function loadWeights(): WeightConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_WEIGHTS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_WEIGHTS };
}

const AlgorithmControlPanel = () => {
  const { toast } = useToast();
  const [weights, setWeights] = useState<WeightConfig>(loadWeights);
  const [hasChanges, setHasChanges] = useState(false);

  const update = (key: keyof WeightConfig, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
    setHasChanges(false);
    toast({ title: "Algorithm weights saved" });
  };

  const handleReset = () => {
    setWeights({ ...DEFAULT_WEIGHTS });
    localStorage.removeItem(STORAGE_KEY);
    setHasChanges(false);
    toast({ title: "Reset to default weights" });
  };

  const rankingWeights = [
    { key: "rating" as const, label: "Rating Weight", description: "How much store rating affects ranking", min: 0, max: 0.5, step: 0.05 },
    { key: "orders" as const, label: "Orders Weight", description: "Impact of completed orders", min: 0, max: 0.5, step: 0.05 },
    { key: "engagement" as const, label: "Engagement Weight", description: "Reviews, followers, products", min: 0, max: 0.5, step: 0.05 },
    { key: "productPopularity" as const, label: "Product Popularity", description: "Product review volume impact", min: 0, max: 0.5, step: 0.05 },
    { key: "recency" as const, label: "Recency Weight", description: "How much recent activity matters", min: 0, max: 0.5, step: 0.05 },
    { key: "verifiedBonus" as const, label: "Verified Bonus", description: "Extra score for verified stores", min: 0, max: 0.2, step: 0.01 },
    { key: "randomization" as const, label: "Randomization", description: "Random factor to prevent stale ordering", min: 0, max: 0.15, step: 0.01 },
  ];

  const boostMultipliers = [
    { key: "boostMultiplier24h" as const, label: "24 Hours Boost", min: 1, max: 3, step: 0.05 },
    { key: "boostMultiplier3d" as const, label: "3 Days Boost", min: 1, max: 3, step: 0.05 },
    { key: "boostMultiplier7d" as const, label: "7 Days Boost", min: 1, max: 3, step: 0.05 },
    { key: "boostMultiplier30d" as const, label: "30 Days Boost", min: 1, max: 3, step: 0.05 },
  ];

  const totalWeight = weights.rating + weights.orders + weights.engagement + weights.productPopularity + weights.recency;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">Algorithm Control</p>
            <p className="text-xs text-muted-foreground">Tune the discovery ranking algorithm</p>
          </div>
        </div>
      </div>

      {/* Ranking Weights */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold">Ranking Weights</p>
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
            Math.abs(totalWeight - 0.85) < 0.01
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}>
            Total: {(totalWeight * 100).toFixed(0)}% {Math.abs(totalWeight - 0.85) < 0.01 ? "✓" : "(default 85%)"}
          </span>
        </div>

        {rankingWeights.map(w => (
          <div key={w.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">{w.label}</p>
                <p className="text-[10px] text-muted-foreground">{w.description}</p>
              </div>
              <span className="text-xs font-bold text-primary min-w-[3rem] text-right">
                {(weights[w.key] * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={w.min}
              max={w.max}
              step={w.step}
              value={weights[w.key]}
              onChange={(e) => update(w.key, parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-secondary accent-primary"
            />
          </div>
        ))}
      </div>

      {/* Boost Multipliers */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <p className="text-xs font-bold">Boost Multipliers</p>

        {boostMultipliers.map(b => (
          <div key={b.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">{b.label}</p>
              <span className="text-xs font-bold text-amber-600 min-w-[3rem] text-right">
                {weights[b.key].toFixed(2)}×
              </span>
            </div>
            <input
              type="range"
              min={b.min}
              max={b.max}
              step={b.step}
              value={weights[b.key]}
              onChange={(e) => update(b.key, parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-secondary accent-primary"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold transition-colors ${
            hasChanges
              ? "petkeep-gradient text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <Save className="h-3.5 w-3.5" /> Save Weights
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-1.5 rounded-xl py-3 px-4 text-xs font-bold bg-secondary text-secondary-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* Info */}
      <div className="rounded-xl bg-secondary/50 p-3">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          💡 These weights control how stores and products are ranked in discovery. Higher weight = more impact on ranking position. 
          Boost multipliers determine how much paid promotions increase visibility. Changes take effect immediately.
        </p>
      </div>
    </div>
  );
};

export default AlgorithmControlPanel;
