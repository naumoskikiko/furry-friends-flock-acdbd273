import { useState } from "react";
import { Coins, TrendingUp, ShieldCheck, Gift, Zap, Star, ShoppingBag, Sparkles, History, ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import { CREDIT_REWARDS, CREDIT_SPENDING, type CreditSpendAction } from "@/lib/creditsConfig";
import { formatDistanceToNow } from "date-fns";

const SPEND_OPTIONS: { key: CreditSpendAction; label: string; icon: React.ReactNode; cost: number }[] = [
  { key: "boost_post", label: "Boost Post", icon: <Zap className="h-4 w-4" />, cost: CREDIT_SPENDING.boost_post },
  { key: "boost_story", label: "Boost Story", icon: <Sparkles className="h-4 w-4" />, cost: CREDIT_SPENDING.boost_story },
  { key: "feature_profile", label: "Feature Profile", icon: <Star className="h-4 w-4" />, cost: CREDIT_SPENDING.feature_profile },
  { key: "store_discount_5pct", label: "5% Store Discount", icon: <ShoppingBag className="h-4 w-4" />, cost: CREDIT_SPENDING.store_discount_5pct },
  { key: "store_discount_10pct", label: "10% Store Discount", icon: <ShoppingBag className="h-4 w-4" />, cost: CREDIT_SPENDING.store_discount_10pct },
  { key: "care_discount_5pct", label: "5% Care Discount", icon: <Gift className="h-4 w-4" />, cost: CREDIT_SPENDING.care_discount_5pct },
  { key: "care_discount_10pct", label: "10% Care Discount", icon: <Gift className="h-4 w-4" />, cost: CREDIT_SPENDING.care_discount_10pct },
];

const EARN_INFO = [
  { action: "Create Post", credits: CREDIT_REWARDS.create_post },
  { action: "Like Received", credits: CREDIT_REWARDS.post_like_received },
  { action: "Comment", credits: CREDIT_REWARDS.post_comment },
  { action: "Comment Received", credits: CREDIT_REWARDS.comment_received },
  { action: "Create Story", credits: CREDIT_REWARDS.create_story },
  { action: "Story Reply", credits: CREDIT_REWARDS.story_reply },
  { action: "Blog Reply", credits: CREDIT_REWARDS.blog_reply },
  { action: "Helpful Answer", credits: CREDIT_REWARDS.helpful_blog_answer },
];

const CreditsPanel = () => {
  const { balance, dailyEarned, monthlyEarned, dailyLimit, monthlyLimit, transactions, spendCredits, loading } = useCredits();
  const { toast } = useToast();
  const [spending, setSpending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSpend = async (action: CreditSpendAction, label: string) => {
    setSpending(true);
    const ok = await spendCredits(action);
    if (ok) {
      toast({ title: `${label} activated!`, description: "Credits deducted from your balance." });
    } else {
      toast({ title: "Not enough credits", variant: "destructive" });
    }
    setSpending(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading credits...</div>;

  const dailyPct = Math.min((dailyEarned / dailyLimit) * 100, 100);
  const monthlyPct = Math.min((monthlyEarned / monthlyLimit) * 100, 100);

  return (
    <div className="space-y-4 px-4 pt-4 pb-8">
      {/* Balance Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <Coins className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">PetKeep Credits</p>
              <p className="text-3xl font-display font-bold text-foreground">{balance.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">1 Credit = 1 MKD discount · Platform currency only</p>
          <div className="mt-3 rounded-xl bg-accent/10 border border-accent/20 p-2.5">
            <p className="text-[11px] text-accent font-semibold">💡 Credits reduce your payment at checkout — they cannot be withdrawn as cash.</p>
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Earning Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Daily ({dailyEarned.toFixed(1)} / {dailyLimit})</span>
              <span className="text-muted-foreground">{dailyPct.toFixed(0)}%</span>
            </div>
            <Progress value={dailyPct} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Monthly ({monthlyEarned.toFixed(1)} / {monthlyLimit})</span>
              <span className="text-muted-foreground">{monthlyPct.toFixed(0)}%</span>
            </div>
            <Progress value={monthlyPct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* How to Earn */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> How to Earn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {EARN_INFO.map((e) => (
              <div key={e.action} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                <span>{e.action}</span>
                <span className="font-mono font-medium text-primary">+{e.credits}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
            <History className="h-4 w-4 text-primary" /> Transaction History
            <Badge variant="secondary" className="text-[10px] ml-auto">{transactions.length}</Badge>
          </CardTitle>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${tx.amount > 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                      {tx.amount > 0 ? <ArrowDown className="h-3 w-3 text-emerald-500" /> : <ArrowUp className="h-3 w-3 text-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate">{tx.description}</p>
                      <p className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
                    </div>
                    <span className={`text-xs font-bold font-mono ${tx.amount > 0 ? "text-emerald-500" : "text-destructive"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default CreditsPanel;
