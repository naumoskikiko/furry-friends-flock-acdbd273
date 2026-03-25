import { useState, useEffect } from "react";
import {
  X, Search, Check, Users, UserPlus, UserMinus, Crown,
  LogOut, Trash2, Pencil, Shield, ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { type Conversation } from "@/hooks/useMessages";

interface GroupSettingsModalProps {
  conversation: Conversation;
  onClose: () => void;
  onLeft: () => void;
  onDeleted: () => void;
}

interface Member {
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

interface SearchUser {
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
}

const rpc = (fn: string, args: Record<string, any>) =>
  supabase.rpc(fn as never, args as never);

const GroupSettingsModal = ({ conversation, onClose, onLeft, onDeleted }: GroupSettingsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"main" | "addMembers" | "editName">("main");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [groupName, setGroupName] = useState(conversation.group_name || "");
  const [confirming, setConfirming] = useState<"leave" | "delete" | "remove" | null>(null);
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = members.find((m) => m.user_id === user?.id)?.is_admin || false;
  const memberCount = members.length;

  const fetchMembers = async () => {
    const { data: participants } = await (supabase as any)
      .from("conversation_participants")
      .select("user_id, is_admin")
      .eq("conversation_id", conversation.id);

    if (!participants?.length) { setMembers([]); setLoading(false); return; }

    const userIds = participants.map((p: any) => p.user_id);
    const adminMap = new Map(participants.map((p: any) => [p.user_id, p.is_admin]));

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .in("user_id", userIds);

    const list: Member[] = (profiles || []).map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url,
      is_admin: !!adminMap.get(p.user_id),
    }));

    // Sort: admins first, then alphabetical
    list.sort((a, b) => {
      if (a.is_admin && !b.is_admin) return -1;
      if (!a.is_admin && b.is_admin) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

    setMembers(list);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, [conversation.id]);

  // Search for users to add
  useEffect(() => {
    if (view !== "addMembers" || search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const clean = search.startsWith("@") ? search.slice(1) : search;
      const existingIds = members.map((m) => m.user_id);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`)
        .not("user_id", "in", `(${existingIds.join(",")})`)
        .limit(15);
      setSearchResults((data as SearchUser[]) || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, view, members]);

  const handleAddMember = async (targetUserId: string) => {
    setBusy(true);
    const { error } = await rpc("group_add_member", {
      _conversation_id: conversation.id,
      _target_user_id: targetUserId,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member added" });
      setSearchResults((prev) => prev.filter((u) => u.user_id !== targetUserId));
      fetchMembers();
    }
  };

  const handleRemoveMember = async () => {
    if (!targetMember) return;
    setBusy(true);
    const { error } = await rpc("group_remove_member", {
      _conversation_id: conversation.id,
      _target_user_id: targetMember.user_id,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${targetMember.full_name} removed` });
      fetchMembers();
    }
    setConfirming(null);
    setTargetMember(null);
  };

  const handlePromote = async (member: Member) => {
    setBusy(true);
    const { error } = await rpc("group_promote_admin", {
      _conversation_id: conversation.id,
      _target_user_id: member.user_id,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${member.full_name} is now an admin` });
      fetchMembers();
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    const { error } = await rpc("group_leave", { _conversation_id: conversation.id });
    setBusy(false);
    if (error) {
      toast({ title: "Can't leave", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "You left the group" });
      onLeft();
    }
    setConfirming(null);
  };

  const handleDelete = async () => {
    setBusy(true);
    const { error } = await rpc("group_delete", { _conversation_id: conversation.id });
    setBusy(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Group deleted" });
      onDeleted();
    }
    setConfirming(null);
  };

  const handleUpdateName = async () => {
    if (!groupName.trim()) return;
    setBusy(true);
    const { error } = await rpc("group_update_info", {
      _conversation_id: conversation.id,
      _new_name: groupName.trim(),
    });
    setBusy(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Group name updated" });
      setView("main");
    }
  };

  const initials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 h-[90vh] flex flex-col rounded-t-3xl bg-card border-t border-border animate-in slide-in-from-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <button
            onClick={() => view !== "main" ? setView("main") : onClose()}
            className="rounded-full p-1.5 hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold">
            {view === "addMembers" ? "Add Members" : view === "editName" ? "Edit Name" : "Group Settings"}
          </h2>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {view === "main" && (
            <div className="px-4 pb-8">
              {/* Group info header */}
              <div className="flex flex-col items-center py-4">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  <AvatarImage src={conversation.group_image_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl font-bold text-white">
                    {(conversation.group_name || "G").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 text-lg font-bold">{conversation.group_name || "Group"}</p>
                <p className="text-xs text-muted-foreground">{memberCount} members</p>

                {isAdmin && (
                  <button
                    onClick={() => setView("editName")}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    <Pencil className="h-3 w-3" /> Edit Name
                  </button>
                )}
              </div>

              <div className="my-2 border-t border-border" />

              {/* Add members (admin only) */}
              {isAdmin && (
                <button
                  onClick={() => setView("addMembers")}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Add Participants</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {/* Members list */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                  Members ({memberCount})
                </p>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 group">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={m.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                          {initials(m.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{m.full_name}</p>
                          {m.user_id === user?.id && (
                            <span className="text-[10px] text-muted-foreground">(You)</span>
                          )}
                        </div>
                        {m.is_admin && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                            <Shield className="h-2.5 w-2.5" /> Admin
                          </div>
                        )}
                        {m.username && !m.is_admin && (
                          <p className="text-[11px] text-muted-foreground">@{m.username}</p>
                        )}
                      </div>
                      {/* Admin actions on non-self members */}
                      {isAdmin && m.user_id !== user?.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!m.is_admin && (
                            <button
                              onClick={() => handlePromote(m)}
                              className="rounded-full p-1.5 hover:bg-primary/10"
                              title="Make admin"
                            >
                              <Crown className="h-3.5 w-3.5 text-primary" />
                            </button>
                          )}
                          <button
                            onClick={() => { setTargetMember(m); setConfirming("remove"); }}
                            className="rounded-full p-1.5 hover:bg-destructive/10"
                            title="Remove"
                          >
                            <UserMinus className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="my-4 border-t border-border" />

              {/* Leave group */}
              {confirming === "leave" ? (
                <div className="rounded-xl bg-destructive/10 p-3 space-y-2 mb-2">
                  <p className="text-xs text-destructive font-semibold">
                    {isAdmin ? "Make sure to assign another admin first." : "Leave this group?"}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirming(null)} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-secondary">Cancel</button>
                    <button onClick={handleLeave} disabled={busy} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-destructive text-destructive-foreground">
                      {busy ? "Leaving..." : "Leave"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming("leave")}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors"
                >
                  <LogOut className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Leave Group</span>
                </button>
              )}

              {/* Delete group (admin only) */}
              {isAdmin && (
                confirming === "delete" ? (
                  <div className="rounded-xl bg-destructive/10 p-3 space-y-2 mt-2">
                    <p className="text-xs text-destructive font-semibold">This will delete the group for all users.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirming(null)} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-secondary">Cancel</button>
                      <button onClick={handleDelete} disabled={busy} className="flex-1 rounded-lg py-2 text-xs font-semibold bg-destructive text-destructive-foreground">
                        {busy ? "Deleting..." : "Delete Group"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming("delete")}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-secondary transition-colors mt-1"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Delete Group</span>
                  </button>
                )
              )}

              {/* Remove member confirmation */}
              {confirming === "remove" && targetMember && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
                  <div className="bg-card rounded-2xl p-5 mx-6 max-w-sm w-full shadow-xl">
                    <p className="text-sm font-semibold mb-1">Remove {targetMember.full_name}?</p>
                    <p className="text-xs text-muted-foreground mb-4">They will no longer be part of this group.</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setConfirming(null); setTargetMember(null); }} className="flex-1 rounded-lg py-2.5 text-sm font-semibold bg-secondary">Cancel</button>
                      <button onClick={handleRemoveMember} disabled={busy} className="flex-1 rounded-lg py-2.5 text-sm font-semibold bg-destructive text-destructive-foreground">
                        {busy ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Members view */}
          {view === "addMembers" && (
            <div className="px-4 pb-6">
              <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 mb-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users to add..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>

              {searchResults.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => handleAddMember(u.user_id)}
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                      {initials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">{u.full_name}</p>
                    {u.username && <p className="text-[11px] text-muted-foreground">@{u.username}</p>}
                  </div>
                  <div className="flex h-8 items-center justify-center rounded-full bg-primary/10 px-3">
                    <UserPlus className="h-3.5 w-3.5 text-primary mr-1" />
                    <span className="text-xs font-semibold text-primary">Add</span>
                  </div>
                </button>
              ))}

              {search.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No users found</p>
              )}
              {search.length < 2 && (
                <p className="text-center text-xs text-muted-foreground py-8">Search for users to add to this group</p>
              )}
            </div>
          )}

          {/* Edit Name view */}
          {view === "editName" && (
            <div className="px-4 pb-6">
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Group Name</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <button
                onClick={handleUpdateName}
                disabled={busy || !groupName.trim()}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GroupSettingsModal;