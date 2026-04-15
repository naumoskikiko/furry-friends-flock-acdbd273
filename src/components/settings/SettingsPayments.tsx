import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

const SettingsPayments = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { methods, defaultMethod, saveCard, setDefault, removeMethod, loading } = usePaymentMethods();

  const [showAddForm, setShowAddForm] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  });
  const [saving, setSaving] = useState(false);

  const isOwner = profile?.role === "owner";

  const handleSaveCard = async () => {
    setSaving(true);
    try {
      await saveCard(cardForm);
      setCardForm({ cardNumber: "", expiry: "", cvv: "", cardholderName: "" });
      setShowAddForm(false);
      toast({ title: "Payment method saved" });
    } catch (error: any) {
      toast({ title: "Could not save card", description: error?.message || "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-5">

      {!isOwner && (
        <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
          <p className="text-sm font-bold">Payout Method</p>
          <p className="text-xs text-muted-foreground">No payout method configured</p>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Bank Account
          </Button>
        </div>
      )}

      {/* Transaction History (placeholder) */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Transaction History</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
        </div>
        <p className="text-xs text-muted-foreground py-4 text-center">No transactions yet</p>
      </div>
    </div>
  );
};

export default SettingsPayments;
