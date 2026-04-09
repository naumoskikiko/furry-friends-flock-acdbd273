import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Zap } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  onSelect: (plan: "monthly" | "yearly") => Promise<void>;
  isRenewal?: boolean;
}

const TrackerSubscriptionModal = ({ open, onOpenChange, petName, onSelect, isRenewal = false }: Props) => {
  const [selected, setSelected] = useState<"monthly" | "yearly">("monthly");
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      await onSelect(selected);
      onOpenChange(false);
    } catch {
      // error handled upstream
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center font-display">
            {isRenewal ? "Renew Subscription" : "Activate Tracker"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-center text-muted-foreground">
          {isRenewal
            ? `Renew tracking for ${petName}`
            : `Choose a plan to activate tracking for ${petName}`}
        </p>

        <div className="space-y-3 mt-2">
          {/* Monthly */}
          <button
            onClick={() => setSelected("monthly")}
            className={`w-full rounded-2xl p-4 text-left transition-all border-2 ${
              selected === "monthly"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-muted-foreground/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">Monthly</p>
                <p className="text-xs text-muted-foreground">Billed every 30 days</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold font-display">€5</p>
                <p className="text-[10px] text-muted-foreground">/month</p>
              </div>
            </div>
            {selected === "monthly" && (
              <CheckCircle2 className="h-4 w-4 text-primary absolute top-4 right-4" />
            )}
          </button>

          {/* Yearly */}
          <button
            onClick={() => setSelected("yearly")}
            className={`w-full rounded-2xl p-4 text-left transition-all border-2 relative ${
              selected === "yearly"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-muted-foreground/30"
            }`}
          >
            <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5">
              <Zap className="h-3 w-3 text-accent-foreground" />
              <span className="text-[10px] font-bold text-accent-foreground">SAVE 17%</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">Yearly</p>
                <p className="text-xs text-muted-foreground">Billed once for 365 days</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold font-display">€50</p>
                <p className="text-[10px] text-muted-foreground">/year</p>
              </div>
            </div>
          </button>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={processing}
          className="w-full rounded-xl h-12 petkeep-gradient text-base mt-2"
        >
          {processing ? "Processing..." : `Pay €${selected === "monthly" ? "5" : "50"}`}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Cancel anytime • No auto-renewal
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default TrackerSubscriptionModal;
