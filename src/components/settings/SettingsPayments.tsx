import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Download, Landmark, Save, Loader2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyPayoutDetails, useMyPayoutRequests } from "@/hooks/usePayoutDetails";
import { useMyOrders } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";

const SettingsPayments = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { details, loading: detailsLoading, save } = useMyPayoutDetails();
  const { requests, loading: reqLoading, requestPayout } = useMyPayoutRequests();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    bank_name: "",
    account_number: "",
    transaction_reference: "",
  });

  const isProviderOrBusiness = profile?.role === "sitter" || (profile?.role as string) === "business" || (profile?.role as string) === "owner" || (profile?.role as string) === "admin" || (profile?.role as string) === "provider";

  const startEditing = () => {
    setForm({
      full_name: details?.full_name || "",
      bank_name: details?.bank_name || "",
      account_number: details?.account_number || "",
      transaction_reference: details?.transaction_reference || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.bank_name || !form.account_number) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await save(form);
      setEditing(false);
      toast({ title: "Payout details saved" });
    } catch (e: any) {
      toast({ title: "Error saving", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Payout Details */}
      {isProviderOrBusiness && (
        <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">Payout Method</p>
            </div>
            {!editing && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEditing}>
                {details ? "Edit" : "Add"}
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Bank Name *</Label>
                <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Chase Bank" className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Account Number (IBAN) *</Label>
                <Input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="DE89 3704 0044 0532 0130 00" className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Transaction Reference</Label>
                <Input value={form.transaction_reference} onChange={e => setForm(f => ({ ...f, transaction_reference: e.target.value }))} placeholder="REF-12345" className="h-9 mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" /> Save</>}
                </Button>
              </div>
            </div>
          ) : details ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{details.full_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{details.bank_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-medium">••••{details.account_number.slice(-4)}</span></div>
              {details.transaction_reference && (
                <div className="flex justify-between"><span className="text-muted-foreground">Ref #</span><span className="font-medium">{details.transaction_reference}</span></div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No payout method configured</p>
          )}
        </div>
      )}

      {/* Payout History */}
      {isProviderOrBusiness && (
        <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
          <p className="text-sm font-bold">Payout History</p>
          {reqLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No payout requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs font-medium">${r.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className={
                    r.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600 border-0"
                      : "bg-amber-500/10 text-amber-600 border-0"
                  }>
                    {r.status === "paid" ? "Paid" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transaction History */}
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
