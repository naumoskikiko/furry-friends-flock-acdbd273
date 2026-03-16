import { useState } from "react";
import { X, Zap, Check } from "lucide-react";
import { useBoostPricing, useCreateBoost } from "@/hooks/useBoosts";
import { useToast } from "@/hooks/use-toast";

interface BoostModalProps {
  type: "product" | "store" | "provider";
  targetId: string;
  targetName: string;
  onClose: () => void;
}

const BoostModal = ({ type, targetId, targetName, onClose }: BoostModalProps) => {
  const { pricing, loading } = useBoostPricing(type);
  const { createBoost } = useCreateBoost();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const selectedPricing = pricing.find((p) => p.id === selected);
  const typeLabel = type === "product" ? "Product" : type === "store" ? "Store" : "Provider";

  const handleBoost = async () => {
    if (!selectedPricing) return;
    setPurchasing(true);
    try {
      await createBoost(type, targetId, selectedPricing.duration_hours, selectedPricing.price);
      toast({ title: "Boost activated! 🚀", description: `${targetName} is now promoted for ${selectedPricing.duration_label}` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setPurchasing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[85vh] flex min-h-0 flex-col rounded-t-3xl sm:rounded-3xl bg-card border border-border animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
                <Zap className="h-4.5 w-4.5 text-amber-500" fill="currentColor" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Boost {typeLabel}</h3>
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{targetName}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-primary/10 p-3">
            <p className="text-xs font-semibold">✨ Boost Benefits</p>
            <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
              <li>• Appears in featured/promoted sections</li>
              <li>• Higher position in search results</li>
              <li>• "Promoted" badge on card</li>
            </ul>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold">Choose Duration</p>
              {pricing.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full flex items-center justify-between rounded-xl p-3 border-2 transition-all ${
                    selected === p.id
                      ? "border-amber-500 bg-amber-500/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selected === p.id && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <span className="text-sm font-semibold">{p.duration_label}</span>
                  </div>
                  <span className="text-sm font-extrabold text-primary">{p.price} MKD</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fixed bottom button */}
        <div className="shrink-0 border-t border-border p-4 bg-card rounded-b-3xl">
          <button
            onClick={handleBoost}
            disabled={!selected || purchasing}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4" fill="currentColor" />
            {purchasing ? "Processing..." : selectedPricing ? `Boost for ${selectedPricing.price} MKD` : "Select a duration"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoostModal;
