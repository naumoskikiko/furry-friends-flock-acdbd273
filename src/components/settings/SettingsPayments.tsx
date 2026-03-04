import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SettingsPayments = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("credit_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setTransactions(data || []));
    supabase.from("credits").select("balance").eq("user_id", user.id).single()
      .then(({ data }) => setCreditBalance(data?.balance || 0));
  }, [user]);

  const isOwner = profile?.role === "owner";

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Balance */}
      <div className="rounded-2xl petkeep-gradient p-5 text-primary-foreground">
        <p className="text-xs font-semibold opacity-80">PetKeep Credits</p>
        <p className="font-display text-3xl font-extrabold mt-1">{creditBalance.toLocaleString()}</p>
        <p className="text-xs opacity-70 mt-0.5">💎 Available balance</p>
      </div>

      {isOwner ? (
        <>
          {/* Saved Payment Methods */}
          <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
            <p className="text-sm font-bold">Saved Payment Methods</p>
            <div className="flex items-center gap-3 py-2 text-muted-foreground">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm">No payment methods saved</span>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add Payment Method
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Sitter Payout */}
          <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
            <p className="text-sm font-bold">Payout Method</p>
            <p className="text-xs text-muted-foreground">No payout method configured</p>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add Bank Account
            </Button>
          </div>
          <div className="rounded-2xl bg-petkeep-mint-light p-4">
            <p className="text-xs font-bold text-petkeep-mint">Pending Earnings</p>
            <p className="font-display text-xl font-extrabold text-foreground mt-1">$0.00</p>
            <p className="text-[10px] text-muted-foreground">Commission: 15%</p>
          </div>
        </>
      )}

      {/* Transaction History */}
      <div className="rounded-2xl bg-card p-4 petkeep-card-shadow space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Transaction History</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No transactions yet</p>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-xs font-semibold">{tx.description || tx.type}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-sm font-bold ${tx.amount > 0 ? "text-petkeep-green" : "text-destructive"}`}>
                {tx.amount > 0 ? "+" : ""}{tx.amount}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SettingsPayments;
