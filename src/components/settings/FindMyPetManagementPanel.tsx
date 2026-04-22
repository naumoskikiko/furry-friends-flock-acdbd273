import { useEffect, useState } from "react";
import {
  Search,
  PawPrint,
  ShieldCheck,
  ShieldOff,
  History,
  Filter,
  Cpu,
  Navigation,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

type FilterMode = "all" | "with" | "without";

interface UserRow {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  tracking_enabled: boolean;
  chip_enabled: boolean;
  tracking_until: string | null;
  chip_until: string | null;
}

const fromTable = (t: string) => (supabase as any).from(t);

const FindMyPetManagementPanel = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    tracking: false,
    chip: false,
    expiry: "none" as "none" | "7d" | "30d" | "365d",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = async () => {
    const { data } = await fromTable("find_my_pet_access_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    if (!data || data.length === 0) {
      setLogs([]);
      return;
    }
    const ids = Array.from(
      new Set([
        ...data.map((r: any) => r.target_user_id),
        ...data.map((r: any) => r.changed_by),
      ])
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .in("user_id", ids);
    const map = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
    setLogs(
      data.map((r: any) => ({
        ...r,
        target: map[r.target_user_id],
        admin: map[r.changed_by],
      }))
    );
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const runSearch = async () => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .limit(50);
    if (search.trim()) {
      q = q.or(
        `full_name.ilike.%${search}%,username.ilike.%${search}%`
      );
    }
    const { data: profiles } = await q;
    if (!profiles || profiles.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }
    const ids = profiles.map((p) => p.user_id);
    const { data: access } = await fromTable("find_my_pet_access")
      .select("*")
      .in("user_id", ids);
    const accessMap = Object.fromEntries(
      (access || []).map((a: any) => [a.user_id, a])
    );

    const rows: UserRow[] = profiles.map((p) => {
      const a = accessMap[p.user_id];
      return {
        user_id: p.user_id,
        full_name: p.full_name,
        username: p.username,
        avatar_url: p.avatar_url,
        tracking_enabled: !!a?.tracking_enabled,
        chip_enabled: !!a?.chip_enabled,
        tracking_until: a?.tracking_enabled_until ?? null,
        chip_until: a?.chip_enabled_until ?? null,
      };
    });
    setUsers(rows);
    setLoading(false);
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = users.filter((u) => {
    const has = u.tracking_enabled || u.chip_enabled;
    if (filter === "with") return has;
    if (filter === "without") return !has;
    return true;
  });

  const openEdit = (u: UserRow) => {
    setEditTarget(u);
    setEditForm({
      tracking: u.tracking_enabled,
      chip: u.chip_enabled,
      expiry: "none",
      reason: "",
    });
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setSubmitting(true);

    let until: string | null = null;
    if (editForm.expiry !== "none") {
      const days = parseInt(editForm.expiry);
      until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error } = await (supabase as any).rpc(
      "admin_set_find_my_pet_access",
      {
        _target_user_id: editTarget.user_id,
        _tracking_enabled: editForm.tracking,
        _chip_enabled: editForm.chip,
        _tracking_until: editForm.tracking ? until : null,
        _chip_until: editForm.chip ? until : null,
        _reason: editForm.reason.trim() || null,
      }
    );
    setSubmitting(false);
    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Access updated" });
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === editTarget.user_id
          ? {
              ...u,
              tracking_enabled: editForm.tracking,
              chip_enabled: editForm.chip,
              tracking_until: editForm.tracking ? until : null,
              chip_until: editForm.chip ? until : null,
            }
          : u
      )
    );
    setEditTarget(null);
    fetchLogs();
  };

  const accessBadge = (enabled: boolean, until: string | null) => {
    if (!enabled) {
      return (
        <Badge variant="secondary" className="text-[10px] gap-1">
          <ShieldOff className="h-3 w-3" /> Off
        </Badge>
      );
    }
    if (until && new Date(until).getTime() <= Date.now()) {
      return (
        <Badge variant="outline" className="text-[10px] gap-1">
          Expired
        </Badge>
      );
    }
    return (
      <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
        <ShieldCheck className="h-3 w-3" /> On
        {until && (
          <span className="text-[9px] opacity-80 ml-1">
            · {format(new Date(until), "MMM d")}
          </span>
        )}
      </Badge>
    );
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <p className="text-sm font-bold flex items-center gap-2">
          <PawPrint className="h-4 w-4" /> FindMyPet Management
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Grant or revoke pet tracking and chip pairing access for any user.
        </p>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" /> Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username"
              className="text-xs"
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            <Button
              size="sm"
              onClick={runSearch}
              disabled={loading}
              className="shrink-0 text-xs"
            >
              Search
            </Button>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {(["all", "with", "without"] as FilterMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setFilter(m)}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  filter === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {m === "all"
                  ? "All"
                  : m === "with"
                  ? "Has access"
                  : "No access"}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No users match
              </p>
            ) : (
              filtered.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center gap-2 rounded-xl border border-border p-2.5"
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      className="h-9 w-9 rounded-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {(u.full_name || u.username || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {u.full_name || u.username || "Unknown"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Navigation className="h-2.5 w-2.5" /> Track
                      </span>
                      {accessBadge(u.tracking_enabled, u.tracking_until)}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-1">
                        <Cpu className="h-2.5 w-2.5" /> Chip
                      </span>
                      {accessBadge(u.chip_enabled, u.chip_until)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] shrink-0"
                    onClick={() => openEdit(u)}
                  >
                    Manage
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Recent Changes
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {logs.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No changes yet
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {logs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-2 py-1.5 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">
                      {r.target?.full_name || r.target?.username || "User"} —
                      Track {r.tracking_enabled ? "ON" : "OFF"} · Chip{" "}
                      {r.chip_enabled ? "ON" : "OFF"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      by {r.admin?.full_name || r.admin?.username || "Admin"} ·{" "}
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {r.reason && (
                      <p className="text-[10px] text-muted-foreground italic truncate">
                        "{r.reason}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" /> Manage Access
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-2.5">
                <p className="text-xs font-semibold">
                  {editTarget.full_name || editTarget.username}
                </p>
                {editTarget.username && (
                  <p className="text-[10px] text-muted-foreground">
                    @{editTarget.username}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Navigation className="h-3.5 w-3.5" /> Pet Tracking
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Live location & safe zones
                  </p>
                </div>
                <Switch
                  checked={editForm.tracking}
                  onCheckedChange={(v) =>
                    setEditForm((s) => ({ ...s, tracking: v }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" /> Chip / Tracker Pairing
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Add and pair tracker devices
                  </p>
                </div>
                <Switch
                  checked={editForm.chip}
                  onCheckedChange={(v) =>
                    setEditForm((s) => ({ ...s, chip: v }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">
                  Auto-expire access
                </label>
                <Select
                  value={editForm.expiry}
                  onValueChange={(v: any) =>
                    setEditForm((s) => ({ ...s, expiry: v }))
                  }
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No expiry</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="365d">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">
                  Reason (optional)
                </label>
                <Input
                  value={editForm.reason}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, reason: e.target.value }))
                  }
                  placeholder="e.g. Granted free access, subscription expired"
                  className="text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTarget(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={submitEdit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FindMyPetManagementPanel;
