import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Ban, Trash2, ShieldCheck, ChevronDown, ChevronUp, Loader2, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const fromTable = (table: string) => (supabase as any).from(table);

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  last_active_at: string | null;
  bio: string | null;
  location: string | null;
  // enriched
  roles: string[];
  post_count?: number;
  pet_count?: number;
  order_count?: number;
  is_suspended?: boolean;
}

const UserManagementPanel = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: rolesData } = await fromTable("user_roles").select("user_id, role");

    const roleMap: Record<string, string[]> = {};
    (rolesData || []).forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    const userList: UserProfile[] = (profiles || []).map((p: any) => ({
      ...p,
      roles: roleMap[p.user_id] || [],
      is_suspended: false,
    }));

    // Enrich with counts
    if (userList.length > 0) {
      const userIds = userList.map(u => u.user_id);

      const [{ data: posts }, { data: pets }, { data: orders }] = await Promise.all([
        fromTable("posts").select("user_id").in("user_id", userIds),
        fromTable("pets").select("owner_id").in("owner_id", userIds),
        fromTable("orders").select("buyer_id").in("buyer_id", userIds),
      ]);

      const postMap = new Map<string, number>();
      (posts || []).forEach((p: any) => postMap.set(p.user_id, (postMap.get(p.user_id) || 0) + 1));
      const petMap = new Map<string, number>();
      (pets || []).forEach((p: any) => petMap.set(p.owner_id, (petMap.get(p.owner_id) || 0) + 1));
      const orderMap = new Map<string, number>();
      (orders || []).forEach((o: any) => orderMap.set(o.buyer_id, (orderMap.get(o.buyer_id) || 0) + 1));

      userList.forEach(u => {
        u.post_count = postMap.get(u.user_id) || 0;
        u.pet_count = petMap.get(u.user_id) || 0;
        u.order_count = orderMap.get(u.user_id) || 0;
      });
    }

    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    if (roleFilter !== "all") {
      if (roleFilter === "user" && u.roles.length > 0) return false;
      if (roleFilter !== "user" && !u.roles.includes(roleFilter)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        u.user_id.includes(q)
      );
    }
    return true;
  });

  const handleDeleteContent = async (userId: string) => {
    if (!confirm("Delete all posts and stories from this user?")) return;
    await fromTable("posts").delete().eq("user_id", userId);
    await fromTable("stories").delete().eq("user_id", userId);
    toast({ title: "User content removed" });
  };

  const getRoleBadge = (u: UserProfile) => {
    if (u.roles.includes("owner")) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px]">Owner</Badge>;
    if (u.roles.includes("admin")) return <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px]">Admin</Badge>;
    if (u.role === "business") return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-[9px]">Business</Badge>;
    if (u.role === "provider") return <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-[9px]">Provider</Badge>;
    return <Badge variant="outline" className="text-[9px]">User</Badge>;
  };

  const filters = ["all", "admin", "business", "provider", "user"];

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">User Management</p>
            <p className="text-xs text-muted-foreground">{users.length} total users on the platform</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or username..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setRoleFilter(f)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${
              roleFilter === f ? "petkeep-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map(u => {
            const isExpanded = expanded === u.user_id;
            return (
              <div key={u.user_id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : u.user_id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-secondary">{u.full_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{u.full_name || "Unnamed"}</p>
                      {getRoleBadge(u)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {u.username ? `@${u.username} · ` : ""}Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-3 py-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-secondary p-2">
                        <p className="text-sm font-bold">{u.post_count}</p>
                        <p className="text-[9px] text-muted-foreground">Posts</p>
                      </div>
                      <div className="rounded-xl bg-secondary p-2">
                        <p className="text-sm font-bold">{u.pet_count}</p>
                        <p className="text-[9px] text-muted-foreground">Pets</p>
                      </div>
                      <div className="rounded-xl bg-secondary p-2">
                        <p className="text-sm font-bold">{u.order_count}</p>
                        <p className="text-[9px] text-muted-foreground">Orders</p>
                      </div>
                    </div>

                    {u.bio && (
                      <div className="rounded-xl bg-secondary p-2.5">
                        <p className="text-[10px] text-muted-foreground">Bio</p>
                        <p className="text-xs mt-0.5">{u.bio}</p>
                      </div>
                    )}

                    {u.location && (
                      <p className="text-xs text-muted-foreground">📍 {u.location}</p>
                    )}

                    {u.last_active_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Last active: {formatDistanceToNow(new Date(u.last_active_at), { addSuffix: true })}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDeleteContent(u.user_id)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove Content
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserManagementPanel;
