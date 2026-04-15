import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TagPeopleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUsers: { id: string; name: string; avatar_url: string | null; username: string }[];
  onDone: (users: { id: string; name: string; avatar_url: string | null; username: string }[]) => void;
  maxTags?: number;
}

const TagPeopleModal = ({ open, onOpenChange, selectedUsers, onDone, maxTags = 10 }: TagPeopleModalProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState(selectedUsers);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSelected(selectedUsers);
  }, [selectedUsers, open]);

  useEffect(() => {
    if (!query.trim() || !user) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const q = query.trim().toLowerCase();
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, username")
        .neq("user_id", user.id)
        .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(20);
      setResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user]);

  const toggleUser = (u: any) => {
    const exists = selected.find(s => s.id === u.user_id);
    if (exists) {
      setSelected(prev => prev.filter(s => s.id !== u.user_id));
    } else if (selected.length < maxTags) {
      setSelected(prev => [...prev, {
        id: u.user_id,
        name: u.full_name || "User",
        avatar_url: u.avatar_url,
        username: u.username || u.full_name || "user",
      }]);
    }
  };

  const isSelected = (userId: string) => selected.some(s => s.id === userId);

  const handleDone = () => {
    onDone(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tag People</DialogTitle>
        </DialogHeader>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {selected.map(u => (
              <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                @{u.username}
                <button onClick={() => setSelected(prev => prev.filter(s => s.id !== u.id))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 py-2">
          {results.map(u => (
            <button
              key={u.user_id}
              onClick={() => toggleUser(u)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-secondary transition-colors"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                  {(u.full_name || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate">{u.full_name || "User"}</p>
                {u.username && <p className="text-xs text-muted-foreground truncate">@{u.username}</p>}
              </div>
              {isSelected(u.user_id) && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
          {query.trim() && !searching && results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No users found</p>
          )}
          {!query.trim() && (
            <p className="py-6 text-center text-sm text-muted-foreground">Search for people to tag</p>
          )}
        </div>

        <Button onClick={handleDone} className="w-full">
          Done ({selected.length})
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default TagPeopleModal;
