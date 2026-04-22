import { useState, useEffect } from "react";
import { Coins, Search, Plus, Minus, BarChart3, ShieldAlert, History, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CREDIT_REWARDS, CREDIT_LIMITS } from "@/lib/creditsConfig";
import { formatDistanceToNow } from "date-fns";

const CreditManagementPanel = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalCredits: 0, totalUsers: 0, totalEarned: 0, totalSpent: 0 });
  const [adminLog, setAdminLog] = useState<any[]>([]);
  const [adjustTarget, setAdjustTarget] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustMode, setAdjustMode] = useState<"add" | "deduct">("add");
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = async () => {
    const { data: credits } = await supabase.from("credits").select("balance");
    const totalCredits = (credits || []).reduce((s, c) => s + Number(c.balance), 0);

    const { data: earned } = await supabase.from("credit_transactions").select("amount").gt("amount", 0);
    const { data: spent } = await supabase.from("credit_transactions").select("amount").lt("amount", 0);

    setStats({
      totalCredits: Math.round(totalCredits * 100) / 100,
      totalUsers: credits?.length || 0,
      totalEarned: Math.round((earned || []).reduce((s, t) => s + Number(t.amount), 0) * 100) / 100,
      totalSpent: Math.round(Math.abs((spent || []).reduce((s, t) => s + Number(t.amount), 0)) * 100) / 100,
    });
  };

  const fetchAdminLog = async () => {
    const { data } = await (supabase as any)
      .from("credit_admin_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data || data.length === 0) {
      setAdminLog([]);
      return;
    }
    const ids = Array.from(new Set([
      ...data.map((r: any) => r.target_user_id),
      ...data.map((r: any) => r.changed_by),
    ]));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .in("user_id", ids);
    const map = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
    setAdminLog(
      data.map((r: any) => ({
        ...r,
        target: map[r.target_user_id],
        admin: map[r.changed_by],
      }))
    );
  };

  useEffect(() => {
    fetchStats();
    fetchAdminLog();
  }, []);

  const searchUsers = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)
      .limit(20);

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map(p => p.user_id);
      const { data: credits } = await supabase.from("credits").select("user_id, balance").in("user_id", userIds);
      const creditMap = Object.fromEntries((credits || []).map(c => [c.user_id, c.balance]));

      setUsers(profiles.map(p => ({
        ...p,
        balance: creditMap[p.user_id] ?? 0,
      })));
    } else {
      setUsers([]);
    }
    setLoading(false);
  };

  const openAdjust = (user: any, mode: "add" | "deduct") => {
    setAdjustTarget(user);
    setAdjustMode(mode);
    setAdjustAmount("");
    setAdjustReason("");
  };

  const submitAdjust = async () => {
    if (!adjustTarget) return;
    const raw = parseFloat(adjustAmount);
    if (!raw || raw <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    const signed = adjustMode === "add" ? raw : -raw;
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc("admin_adjust_user_credits", {
      _target_user_id: adjustTarget.user_id,
      _amount: signed,
      _reason: adjustReason.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Adjustment failed", description: error.message, variant: "destructive" });
      return;
    }

    const newBalance = Number(data ?? 0);
    setUsers(prev => prev.map(u => u.user_id === adjustTarget.user_id ? { ...u, balance: newBalance } : u));
    toast({
      title: adjustMode === "add" ? `Added ${raw} credits` : `Deducted ${raw} credits`,
      description: `New balance: ${newBalance.toFixed(2)}`,
    });
    setAdjustTarget(null);
    fetchStats();
    fetchAdminLog();
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <p className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4" /> PetKeep Credits Management</p>
        <p className="text-xs text-muted-foreground mt-1">
          Daily earnings accumulate into a monthly cap of {CREDIT_LIMITS.monthly_max}. Daily counter resets at midnight, monthly resets on the 1st.
        </p>
      </div>

      {/* Economy Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Total in Circulation</p>
            <p className="text-lg font-bold text-primary">{stats.totalCredits.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Users with Credits</p>
            <p className="text-lg font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Total Earned</p>
            <p className="text-lg font-bold text-emerald-500">+{stats.totalEarned.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Total Spent</p>
            <p className="text-lg font-bold text-destructive">-{stats.totalSpent.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Config */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Current Reward Config
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(CREDIT_REWARDS).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                <span className="capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-mono text-primary">+{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-border space-y-1">
            <div className="flex justify-between text-xs">
              <span>Daily earn limit</span>
              <Badge variant="secondary">{CREDIT_LIMITS.daily_max}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span>Monthly earn limit</span>
              <Badge variant="secondary">{CREDIT_LIMITS.monthly_max}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Search & Adjust */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" /> User Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or username"
              className="text-xs"
              onKeyDown={e => e.key === "Enter" && searchUsers()}
            />
            <Button size="sm" onClick={searchUsers} disabled={loading} className="shrink-0 text-xs">Search</Button>
          </div>
          {users.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.user_id}>
                      <TableCell className="text-xs font-semibold">
                        <div className="flex flex-col">
                          <span>{u.full_name || u.username || "Unknown"}</span>
                          {u.username && <span className="text-[10px] text-muted-foreground">@{u.username}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">{Number(u.balance).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => openAdjust(u, "add")}
                          >
                            <Plus className="h-3 w-3" /> Add
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => openAdjust(u, "deduct")}
                          >
                            <Minus className="h-3 w-3" /> Deduct
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Adjustment Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Recent Admin Adjustments
            <Badge variant="secondary" className="ml-auto text-[10px]">{adminLog.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adminLog.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No admin adjustments yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {adminLog.map((r) => (
                <div key={r.id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${Number(r.amount) > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                    {Number(r.amount) > 0 ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">
                      {r.target?.full_name || r.target?.username || "User"} — {Number(r.amount) > 0 ? "+" : ""}{r.amount}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      by {r.admin?.full_name || r.admin?.username || "Admin"} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                    {r.reason && <p className="text-[10px] text-muted-foreground italic truncate">"{r.reason}"</p>}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {Number(r.previous_balance).toFixed(1)} → {Number(r.new_balance).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anti-abuse note */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold">Anti-Abuse Protections Active</p>
              <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5 list-disc pl-3">
                <li>Daily earn cap: {CREDIT_LIMITS.daily_max} credits (resets at midnight)</li>
                <li>Monthly earn cap: {CREDIT_LIMITS.monthly_max} credits (resets on the 1st)</li>
                <li>Negative balances are blocked at the database layer</li>
                <li>Duplicate interaction filtering (source_id dedup)</li>
                <li>Anti-spam cooldown enforcement</li>
                <li>Credits are non-withdrawable platform currency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Dialog */}
      <Dialog open={!!adjustTarget} onOpenChange={(o) => !o && setAdjustTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {adjustMode === "add" ? <Plus className="h-4 w-4 text-emerald-500" /> : <Minus className="h-4 w-4 text-destructive" />}
              {adjustMode === "add" ? "Add Credits" : "Deduct Credits"}
            </DialogTitle>
          </DialogHeader>
          {adjustTarget && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted p-2.5">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{adjustTarget.full_name || adjustTarget.username}</p>
                  <p className="text-[10px] text-muted-foreground">Current balance: {Number(adjustTarget.balance).toFixed(2)}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Amount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Reason (optional)</label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Compensation for issue"
                  className="text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustTarget(null)} disabled={submitting}>Cancel</Button>
            <Button
              size="sm"
              variant={adjustMode === "add" ? "default" : "destructive"}
              onClick={submitAdjust}
              disabled={submitting || !adjustAmount}
            >
              {submitting ? "Saving..." : adjustMode === "add" ? "Add Credits" : "Deduct Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditManagementPanel;
