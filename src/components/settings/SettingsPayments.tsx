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
      {/* Saved Payment Methods */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Saved Payment Methods</p>
          <Button variant="outline" size="sm" onClick={() => setShowAddForm((prev) => !prev)}>
            <Plus className="h-4 w-4 mr-1" /> Add Payment Method
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading payment methods...</p>
        ) : methods.length === 0 ? (
          <div className="flex items-center gap-3 py-2 text-muted-foreground">
            <CreditCard className="h-5 w-5" />
            <span className="text-sm">No payment methods saved</span>
          </div>
        ) : (
          <div className="space-y-2">
            {methods.map((method) => (
              <div key={method.id} className="rounded-xl border border-border p-3 flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold capitalize">
                    {method.card_brand} •••• {method.card_last4}
                    {method.id === defaultMethod?.id && <span className="ml-2 text-[10px] text-primary">Default</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {method.cardholder_name} · {String(method.exp_month).padStart(2, "0")}/{String(method.exp_year).slice(-2)}
                  </p>
                </div>
                {method.id !== defaultMethod?.id && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDefault(method.id)}>
                    Set default
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMethod(method.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {showAddForm && (
          <div className="rounded-xl bg-secondary p-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Card number</Label>
              <Input
                inputMode="numeric"
                autoComplete="cc-number"
                value={cardForm.cardNumber}
                onChange={(e) => setCardForm((prev) => ({ ...prev, cardNumber: e.target.value.replace(/[^\d\s]/g, "") }))}
                placeholder="4242 4242 4242 4242"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Expiration</Label>
                <Input
                  autoComplete="cc-exp"
                  value={cardForm.expiry}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, expiry: e.target.value.replace(/[^\d/]/g, "") }))}
                  placeholder="MM/YY"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CVV</Label>
                <Input
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  type="password"
                  value={cardForm.cvv}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, "") }))}
                  placeholder="123"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Card holder name</Label>
              <Input
                autoComplete="cc-name"
                value={cardForm.cardholderName}
                onChange={(e) => setCardForm((prev) => ({ ...prev, cardholderName: e.target.value }))}
                placeholder="Card holder name"
              />
            </div>
            <Button size="sm" className="w-full" onClick={handleSaveCard} disabled={saving}>
              {saving ? "Saving..." : "Save card securely"}
            </Button>
          </div>
        )}
      </div>

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
