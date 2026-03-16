import { useState, useMemo } from "react";
import { Wallet, ArrowUpRight, DollarSign, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  balance: any;
  payments: any[];
  payouts: any[];
  requestPayout: (amount: number) => Promise<void>;
}

const CareEarningsTab = ({ balance, payments, payouts, requestPayout }: Props) => {
  const { toast } = useToast();
  const [payoutAmount, setPayoutAmount] = useState("");

  const handleRequestPayout = async () => {
    const amt = Number(payoutAmount);
    if (!amt || amt <= 0 || amt > (balance?.available_balance || 0)) return;
    await requestPayout(amt);
    setPayoutAmount("");
    toast({ title: "Payout requested!", description: `${amt} MKD will be processed soon` });
  };

  // Earnings breakdown
  const { todayEarnings, weekEarnings, monthEarnings } = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    
    let todayE = 0, weekE = 0, monthE = 0;
    payments.forEach((p: any) => {
      const d = new Date(p.created_at);
      const earnings = Number(p.provider_earnings || 0);
      if (p.created_at.startsWith(today)) todayE += earnings;
      if (d >= weekAgo) weekE += earnings;
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) monthE += earnings;
    });
    return { todayEarnings: todayE, weekEarnings: weekE, monthEarnings: monthE };
  }, [payments]);

  // Revenue chart (last 7 days)
  const revenueChart = useMemo(() => {
    const dayMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    payments.forEach((p: any) => {
      const day = p.created_at?.slice(0, 10);
      if (day && dayMap[day] !== undefined) dayMap[day] += Number(p.provider_earnings || 0);
    });
    return Object.entries(dayMap).map(([date, amount]) => ({
      label: new Date(date).toLocaleDateString("en-GB", { weekday: "short" }),
      amount,
    }));
  }, [payments]);

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className="rounded-2xl petkeep-gradient p-5 text-primary-foreground">
        <p className="text-xs font-semibold opacity-80">Available Balance</p>
        <p className="font-display text-3xl font-extrabold mt-1">
          {(balance?.available_balance || 0).toLocaleString()} MKD
        </p>
        <p className="text-xs opacity-70 mt-0.5">💰 Ready for payout</p>
      </div>

      {/* Earnings breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <p className="font-display text-lg font-extrabold text-primary">{todayEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Today (MKD)</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <p className="font-display text-lg font-extrabold text-primary">{weekEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">This Week</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <p className="font-display text-lg font-extrabold text-primary">{monthEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">This Month</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <p className="font-display text-xl font-extrabold">{(balance?.total_earned || 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Total Earned (MKD)</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <p className="font-display text-xl font-extrabold text-muted-foreground">{(balance?.total_platform_fees || 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Platform Fees (10%)</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h4 className="text-xs font-bold mb-3">📈 Revenue (Last 7 Days)</h4>
        <div className="flex items-end gap-1 h-24">
          {revenueChart.map((d, i) => {
            const max = Math.max(...revenueChart.map((x) => x.amount), 1);
            const h = Math.max(4, (d.amount / max) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] font-bold">{d.amount > 0 ? d.amount : ""}</span>
                <div className="w-full rounded-t-md petkeep-gradient transition-all" style={{ height: `${h}%` }} />
                <span className="text-[8px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {(balance?.pending_balance || 0) > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Pending Payout</p>
          <p className="font-display text-lg font-extrabold text-amber-700 dark:text-amber-300">{(balance?.pending_balance || 0).toLocaleString()} MKD</p>
        </div>
      )}

      {/* Request Payout */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Request Payout</h3>
        </div>
        <div className="flex gap-2">
          <input
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            type="number"
            placeholder="Amount (MKD)"
            max={balance?.available_balance || 0}
            className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm outline-none"
          />
          <button
            onClick={handleRequestPayout}
            disabled={!payoutAmount || Number(payoutAmount) <= 0 || Number(payoutAmount) > (balance?.available_balance || 0)}
            className="petkeep-gradient rounded-xl px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 flex items-center gap-1"
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Request
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground">💳 Simulated payouts · Stripe Connect coming soon</p>
      </div>

      {/* Recent Payments */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <h3 className="text-sm font-bold">Recent Payments</h3>
        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No payments yet</p>
        ) : payments.slice(0, 10).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-xs font-semibold">{p.total_amount} MKD</p>
              <p className="text-[10px] text-muted-foreground">Fee: {p.platform_fee} MKD · Net: {p.provider_earnings} MKD</p>
              <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              p.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
            }`}>{p.status}</span>
          </div>
        ))}
      </div>

      {/* Payout History */}
      {payouts.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <h3 className="text-sm font-bold">Payout History</h3>
          {payouts.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-xs font-semibold">{p.amount} MKD</p>
                <p className="text-[10px] text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                p.status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : p.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareEarningsTab;
