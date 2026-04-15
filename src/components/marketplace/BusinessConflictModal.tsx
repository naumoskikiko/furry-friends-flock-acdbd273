import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { CartBusinessConflict } from "@/hooks/useCart";

interface Props {
  conflict: CartBusinessConflict | null;
  onResolve: (action: "clear" | "cancel") => void;
}

const BusinessConflictModal = ({ conflict, onResolve }: Props) => {
  if (!conflict) return null;

  return (
    <Dialog open={!!conflict} onOpenChange={() => onResolve("cancel")}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-base">Different Store</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Your cart has items from <span className="font-semibold text-foreground">{conflict.currentBusinessName}</span>.
            You can only order from one store at a time.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={() => onResolve("clear")}
            className="w-full rounded-xl"
            variant="default"
          >
            Clear Cart & Add from {conflict.newBusinessName}
          </Button>
          <Button
            onClick={() => onResolve("cancel")}
            className="w-full rounded-xl"
            variant="outline"
          >
            Keep Current Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessConflictModal;
