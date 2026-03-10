import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface SearchFilters {
  contentTypes: string[];
  location: "all" | "near-me" | "city" | "country";
  sort: "relevant" | "popular" | "newest";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: SearchFilters;
  onApply: (f: SearchFilters) => void;
}

const CONTENT_TYPES = [
  { id: "users", label: "Users" },
  { id: "posts", label: "Posts" },
  { id: "places", label: "Places" },
  { id: "sitters", label: "Sitters" },
  { id: "stores", label: "Stores" },
  { id: "vets", label: "Veterinarians" },
];

const SearchFilterModal = ({ open, onOpenChange, filters, onApply }: Props) => {
  const [local, setLocal] = useState<SearchFilters>(filters);

  const toggleContentType = (id: string) => {
    setLocal((prev) => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(id)
        ? prev.contentTypes.filter((t) => t !== id)
        : [...prev.contentTypes, id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Search Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Content Type */}
          <div>
            <p className="text-sm font-bold mb-2">Content Type</p>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_TYPES.map((ct) => (
                <label key={ct.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 cursor-pointer">
                  <Checkbox
                    checked={local.contentTypes.includes(ct.id)}
                    onCheckedChange={() => toggleContentType(ct.id)}
                  />
                  <span className="text-sm">{ct.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-sm font-bold mb-2">Location</p>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "all", label: "All" },
                { id: "near-me", label: "Near Me" },
                { id: "city", label: "City" },
                { id: "country", label: "Country" },
              ] as const).map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setLocal((p) => ({ ...p, location: loc.id }))}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    local.location === loc.id
                      ? "petkeep-gradient text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-sm font-bold mb-2">Sort By</p>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "relevant", label: "Most Relevant" },
                { id: "popular", label: "Most Popular" },
                { id: "newest", label: "Newest" },
              ] as const).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setLocal((p) => ({ ...p, sort: s.id }))}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    local.sort === s.id
                      ? "petkeep-gradient text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const reset: SearchFilters = { contentTypes: [], location: "all", sort: "relevant" };
                setLocal(reset);
                onApply(reset);
                onOpenChange(false);
              }}
            >
              Reset
            </Button>
            <Button
              className="flex-1 petkeep-gradient text-primary-foreground font-bold"
              onClick={() => { onApply(local); onOpenChange(false); }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchFilterModal;
