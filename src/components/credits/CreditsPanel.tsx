import { useState } from "react";
import { Coins, TrendingUp, ShieldCheck, History, ArrowDown, ArrowUp, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCredits } from "@/hooks/useCredits";
import { CREDIT_REWARDS } from "@/lib/creditsConfig";
import { formatDistanceToNow } from "date-fns";

const EARN_INFO = [
  { action: "Create Post", credits: CREDIT_REWARDS.create_post },
  { action: "Like Given", credits: CREDIT_REWARDS.like_given },
  { action: "Comment", credits: CREDIT_REWARDS.post_comment },
  { action: "Create Story", credits: CREDIT_REWARDS.create_story },
  { action: "Blog Reply", credits: CREDIT_REWARDS.blog_reply },
  { action: "Helpful Answer", credits: CREDIT_REWARDS.helpful_blog_answer },
];

const CreditsPanel = () => {
  const { balance, dailyEarned, monthlyEarned, dailyLimit, monthlyLimit, transactions, loading } = useCredits();
  const [showHistory, setShowHistory] = useState(false);

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
            <p className="text-[11px] text-accent font-semibold">
              <ShoppingBag className="inline h-3.5 w-3.5 mr-1" />
              Credits can only be used for marketplace purchases at checkout.
            </p>
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
            {dailyEarned >= dailyLimit && (
              <p className="text-[10px] text-destructive mt-1">Daily limit reached — resets at midnight</p>
            )}
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Monthly ({monthlyEarned.toFixed(1)} / {monthlyLimit})</span>
              <span className="text-muted-foreground">{monthlyPct.toFixed(0)}%</span>
            </div>
            <Progress value={monthlyPct} className="h-2" />
            {monthlyEarned >= monthlyLimit && (
              <p className="text-[10px] text-destructive mt-1">Monthly limit reached — resets on the 1st</p>
            )}
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
