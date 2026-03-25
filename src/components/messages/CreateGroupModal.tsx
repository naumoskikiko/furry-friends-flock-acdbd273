import { useState, useEffect } from "react";
import { X, Search, Check, Users, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
}

const CreateGroupModal = ({ onClose, onCreated }: CreateGroupModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "details">("select");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<UserProfile[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const cleanQuery = search.startsWith("@") ? search.slice(1) : search;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
        .neq("user_id", user?.id || "")
        .limit(15);
      setResults((data as UserProfile[]) || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user?.id]);

  const toggleUser = (profile: UserProfile) => {
    setSelected((prev) =>
      prev.find((p) => p.user_id === profile.user_id)
        ? prev.filter((p) => p.user_id !== profile.user_id)
        : [...prev, profile]
    );
  };

  const handleCreate = async () => {
    if (!user || selected.length < 2 || !groupName.trim()) return;
    setCreating(true);

    try {
      // Create conversation with group flag
      const { data: conv, error: convError } = await (supabase as any)
        .from("conversations")
        .insert({
          is_group: true,
          group_name: groupName.trim(),
          created_by: user.id,
        })
        .select("id")
        .single();

      if (convError) throw convError;

      // Add all participants including creator
      const participants = [
        { conversation_id: conv.id, user_id: user.id, is_admin: true },
        ...selected.map((s) => ({
          conversation_id: conv.id,
          user_id: s.user_id,
          is_admin: false,
        })),
      ];

      const { error: partError } = await (supabase as any)
        .from("conversation_participants")
        .insert(participants);

      if (partError) throw partError;

      // Send system message
      await (supabase as any).from("messages").insert({
        conversation_id: conv.id,
        sender_id: user.id,
        message_text: `Group "${groupName.trim()}" created`,
        message_type: "system",
      });

      toast({ title: "Group created!" });
      onCreated(conv.id);
    } catch (e: any) {
      toast({ title: "Failed to create group", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] flex flex-col rounded-t-3xl bg-card border-t border-border animate-in slide-in-from-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold">
            {step === "select" ? "Select Members" : "Group Details"}
          </h2>
          {step === "select" ? (
            <button
              onClick={() => setStep("details")}
              disabled={selected.length < 2}
              className="text-sm font-bold text-primary disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating || !groupName.trim()}
              className="text-sm font-bold text-primary disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          )}
        </div>

        {step === "select" ? (
          <div className="flex-1 overflow-y-auto">
            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {selected.map((s) => (
                  <button
                    key={s.user_id}
                    onClick={() => toggleUser(s)}
                    className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    {s.full_name}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="px-4 pb-6">
              {results.map((p) => {
                const isSelected = selected.some((s) => s.user_id === p.user_id);
                return (
                  <button
                    key={p.user_id}
                    onClick={() => toggleUser(p)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                        {getInitials(p.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold">{p.full_name}</p>
                      {p.username && <p className="text-[11px] text-muted-foreground">@{p.username}</p>}
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
              {search.length >= 2 && results.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No users found</p>
              )}
              {search.length < 2 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Search for at least 2 users to create a group
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {/* Group avatar placeholder */}
            <div className="flex flex-col items-center py-4">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            {/* Group name */}
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

            {/* Members list */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Members ({selected.length + 1})
              </p>
              {selected.map((s) => (
                <div key={s.user_id} className="flex items-center gap-3 py-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={s.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                      {getInitials(s.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{s.full_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateGroupModal;
