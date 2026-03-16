import { useState, useEffect } from "react";
import { Coins, Search, Plus, Minus, BarChart3, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CREDIT_REWARDS, CREDIT_LIMITS } from "@/lib/creditsConfig";

const CreditManagementPanel = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalCredits: 0, totalUsers: 0, totalEarned: 0, totalSpent: 0 });

  const fetchStats = async () => {
    const { data: credits } = await supabase.from("credits").select("balance");
    const totalCredits = (credits || []).reduce((s, c) => s + Number(c.balance), 0);
    
    const { data: earned } = await supabase.from("credit_transactions").select("amount").eq("type", "earn");
    const { data: spent } = await supabase.from("credit_transactions").select("amount").eq("type", "spend");
    
    setStats({
      totalCredits: Math.round(totalCredits * 100) / 100,
      totalUsers: credits?.length || 0,
      totalEarned: (earned || []).reduce((s, t) => s + Number(t.amount), 0),
      totalSpent: Math.abs((spent || []).reduce((s, t) => s + Number(t.amount), 0)),
    });
  };

  useEffect(() => { fetchStats(); }, []);

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

  const adjustCredits = async (userId: string, amount: number) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    const newBalance = Math.max(0, user.balance + amount);
    await supabase.from("credits").update({ balance: newBalance, updated_at: new Date().toISOString() }).eq("user_id", userId);
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount,
      type: amount > 0 ? "earn" : "spend",
      description: `Admin ${amount > 0 ? "added" : "removed"} credits`,
    });

    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, balance: newBalance } : u));
    fetchStats();
    toast({ title: `${amount > 0 ? "Added" : "Removed"} ${Math.abs(amount)} credits` });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <p className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4" /> PetKeep Credits Management</p>
        <p className="text-xs text-muted-foreground mt-1">Monitor and manage the platform credit economy.</p>
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
              <span>Daily limit</span>
              <Badge variant="secondary">{CREDIT_LIMITS.daily_max}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span>Monthly limit</span>
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or username" className="text-xs"
              onKeyDown={e => e.key === "Enter" && searchUsers()} />
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
                      <TableCell className="text-xs font-semibold">{u.full_name || u.username || "Unknown"}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{Number(u.balance).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => adjustCredits(u.user_id, 10)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => adjustCredits(u.user_id, -10)}>
                            <Minus className="h-3 w-3" />
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

      {/* Anti-abuse note */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold">Anti-Abuse Protections Active</p>
              <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5 list-disc pl-3">
                <li>Daily earning cap: {CREDIT_LIMITS.daily_max} credits</li>
                <li>Monthly earning cap: {CREDIT_LIMITS.monthly_max} credits</li>
                <li>Duplicate interaction filtering (source_id dedup)</li>
                <li>Per-post like reward cap: {CREDIT_LIMITS.max_likes_per_post}</li>
                <li>Credits are non-withdrawable platform currency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditManagementPanel;
