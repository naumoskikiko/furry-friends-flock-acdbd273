import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ShieldCheck, Shield, User, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileWithRoles {
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  roles: string[];
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
  moderator: <Shield className="h-3 w-3" />,
  user: <User className="h-3 w-3" />,
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  admin: "bg-primary/10 text-primary border-primary/30",
  moderator: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  user: "bg-muted text-muted-foreground border-border",
};

const RoleManagementPanel = () => {
  const [profiles, setProfiles] = useState<ProfileWithRoles[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch all profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .order("full_name");

    // Fetch all roles (owner can see all via RLS)
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (profilesData) {
      const roleMap: Record<string, string[]> = {};
      rolesData?.forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      setProfiles(
        profilesData.map((p) => ({
          ...p,
          roles: roleMap[p.user_id] || [],
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = profiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.username && p.username.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleAdmin = async (userId: string, hasAdmin: boolean) => {
    setActionLoading(userId);
    try {
      if (hasAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
        toast.success("Admin role removed");
      } else {
        // Add admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
        toast.success("Admin role granted");
      }
      await fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    }
    setActionLoading(null);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-primary/10 p-4">
        <p className="text-sm font-bold flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" /> Role Management
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Assign or remove admin roles. Only the Owner can manage roles.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map((user) => {
            const isOwner = user.roles.includes("owner");
            const hasAdmin = user.roles.includes("admin");

            return (
              <div
                key={user.user_id}
                className="flex items-center gap-3 rounded-xl px-3 py-3 bg-card border border-border"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {user.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.full_name || "Unnamed"}</p>
                  {user.username && (
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  )}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {user.roles.length === 0 && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS.user}`}>
                        <User className="h-2.5 w-2.5 mr-0.5" /> User
                      </Badge>
                    )}
                    {user.roles.map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[role] || ROLE_COLORS.user}`}
                      >
                        {ROLE_ICONS[role]} {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {!isOwner && (
                  <Button
                    size="sm"
                    variant={hasAdmin ? "destructive" : "outline"}
                    className="text-xs h-8 px-3"
                    disabled={actionLoading === user.user_id}
                    onClick={() => toggleAdmin(user.user_id, hasAdmin)}
                  >
                    {actionLoading === user.user_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : hasAdmin ? (
                      "Remove Admin"
                    ) : (
                      "Make Admin"
                    )}
                  </Button>
                )}

                {isOwner && (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                    Owner
                  </Badge>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleManagementPanel;
