import { useState } from "react";
import {
  Search, Pin, PinOff, Trash2, MoreHorizontal,
  Archive, ArchiveRestore, BellOff, Bell, FileEdit, Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useConversations, type Conversation,
  getOrCreateConversation, getActivityStatus,
} from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import CreateGroupModal from "./CreateGroupModal";

interface ConversationListProps {
  onSelect: (conv: Conversation) => void;
}

const ConversationList = ({ onSelect }: ConversationListProps) => {
  const {
    conversations, loading, togglePin, toggleArchive,
    toggleMute, deleteConversation, showArchived,
    setShowArchived, archivedCount,
  } = useConversations();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const cleanQuery = query.startsWith("@") ? query.slice(1) : query;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
      .neq("user_id", user?.id || "")
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const startConversation = async (otherUserId: string, profile: any) => {
    if (!user) return;
    try {
      const convId = await getOrCreateConversation(otherUserId);
      onSelect({
        id: convId,
        created_at: new Date().toISOString(),
        other_user: {
          user_id: profile.user_id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          last_active_at: null,
        },
        unread_count: 0,
        is_pinned: false,
        is_archived: false,
        is_muted: false,
      });
      setSearch("");
      setSearchResults([]);
    } catch (e) {
      console.error("Failed to create conversation", e);
    }
  };

  const filtered = search.length >= 2
    ? conversations.filter((c) =>
        (c.is_group ? c.group_name : c.other_user.full_name)?.toLowerCase().includes(search.toLowerCase()) ||
        c.other_user.username?.toLowerCase().includes(search.replace("@", "").toLowerCase()) ||
        c.group_name?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  return (
    <div>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">
          {showArchived ? "Archived" : "Messages"}
        </h1>
        <div className="flex items-center gap-2">
          {!showArchived && (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
            >
              <Users className="h-4 w-4" /> New Group
            </button>
          )}
          {showArchived ? (
            <button onClick={() => setShowArchived(false)} className="text-xs font-semibold text-primary">
              ← Back
            </button>
          ) : archivedCount > 0 ? (
            <button onClick={() => setShowArchived(true)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <Archive className="h-3.5 w-3.5" /> Archived ({archivedCount})
            </button>
          ) : null}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search @username or name..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Profile search results */}
      {search.length >= 2 && searchResults.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">People</p>
          {searchResults.map((p) => {
            const initials = p.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
            return (
              <button
                key={p.user_id}
                onClick={() => startConversation(p.user_id, p)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-bold">{p.full_name}</p>
                  {p.username && <p className="text-[11px] text-muted-foreground">@{p.username}</p>}
                </div>
              </button>
            );
          })}
          <div className="border-b border-border my-2" />
        </div>
      )}

      {/* Conversations */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <span className="text-4xl mb-2">{showArchived ? "📦" : "💬"}</span>
          <p className="text-sm font-semibold">
            {showArchived ? "No archived conversations" : "No conversations yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {showArchived ? "Archived chats will appear here" : "Search for a user to start chatting"}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((c) => {
            const displayName = c.is_group ? (c.group_name || "Group") : (c.other_user.username ? `@${c.other_user.username}` : c.other_user.full_name);
            const initials = c.is_group
              ? (c.group_name || "G").slice(0, 2).toUpperCase()
              : c.other_user.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
            const timeAgo = c.last_message?.created_at
              ? formatDistanceToNow(new Date(c.last_message.created_at), { addSuffix: false })
              : "";
            const activity = c.is_group ? { isOnline: false, label: `${(c.group_members?.length || 0) + 1} members` } : getActivityStatus(c.other_user.last_active_at);

            const lastText = c.draft
              ? c.draft
              : c.last_message?.deleted_at
              ? "This message was deleted"
              : c.last_message?.message_type === "appointment"
              ? "📅 Appointment booked"
              : c.last_message?.message_text || "No messages yet";

            return (
              <div key={c.id} className="relative flex items-center group">
                <button
                  onClick={() => onSelect(c)}
                  className="flex flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={c.is_group ? (c.group_image_url || undefined) : (c.other_user.avatar_url || undefined)} />
                      <AvatarFallback className={`font-display text-sm font-bold text-primary-foreground ${c.is_group ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" : "bg-gradient-to-br from-primary to-accent"}`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {activity.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-accent ring-2 ring-card" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {c.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        {c.is_muted && <BellOff className="h-3 w-3 text-muted-foreground shrink-0" />}
                        <span className="text-sm font-bold truncate">{displayName}</span>
                      </div>
                      {timeAgo && (
                        <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{timeAgo}</span>
                      )}
                    </div>
                    <p className={`truncate text-xs flex items-center gap-1 ${
                      c.draft
                        ? "text-primary italic"
                        : c.unread_count > 0
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}>
                      {c.draft && <FileEdit className="h-3 w-3 shrink-0" />}
                      {c.draft ? `Draft: ${lastText}` : lastText}
                    </p>
                  </div>
                  {c.unread_count > 0 && (
                    <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {c.unread_count}
                    </div>
                  )}
                </button>

                {/* Quick actions */}
                <div className="relative pr-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}
                    className="opacity-0 group-hover:opacity-100 rounded-full p-1.5 hover:bg-secondary transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {menuOpen === c.id && (
                    <div className="absolute right-2 top-full z-50 w-44 rounded-xl border border-border bg-card shadow-lg py-1 text-sm">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(c.id, !c.is_pinned); setMenuOpen(null); }}
                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                      >
                        {c.is_pinned ? <><PinOff className="h-3.5 w-3.5" /> Unpin</> : <><Pin className="h-3.5 w-3.5" /> Pin</>}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMute(c.id, !c.is_muted); setMenuOpen(null); toast({ title: c.is_muted ? "Unmuted" : "Muted" }); }}
                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                      >
                        {c.is_muted ? <><Bell className="h-3.5 w-3.5" /> Unmute</> : <><BellOff className="h-3.5 w-3.5" /> Mute</>}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleArchive(c.id, !c.is_archived); setMenuOpen(null); toast({ title: c.is_archived ? "Unarchived" : "Archived" }); }}
                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
                      >
                        {c.is_archived
                          ? <><ArchiveRestore className="h-3.5 w-3.5" /> Unarchive</>
                          : <><Archive className="h-3.5 w-3.5" /> Archive</>}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); setMenuOpen(null); toast({ title: "Conversation deleted" }); }}
                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Create group modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(convId) => {
            setShowCreateGroup(false);
            onSelect({
              id: convId,
              created_at: new Date().toISOString(),
              other_user: { user_id: "", full_name: "Group", username: null, avatar_url: null, last_active_at: null },
              is_group: true,
              group_name: "Group",
              unread_count: 0,
              is_pinned: false,
              is_archived: false,
              is_muted: false,
            });
          }}
        />
      )}
    </div>
  );
};

export default ConversationList;
