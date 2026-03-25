import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface PostLocationSearchProps {
  value: string;
  onChange: (name: string, lat: number, lng: number) => void;
  onClear: () => void;
}

const PostLocationSearch = ({ value, onChange, onClear }: PostLocationSearchProps) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const searchLocation = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=0`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: LocationResult[] = await res.json();
      setResults(data);
      setShowDropdown(true);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(val), 400);
  };

  const handleSelect = (r: LocationResult) => {
    const shortName = r.display_name.split(",").slice(0, 2).join(",").trim();
    setQuery(shortName);
    setShowDropdown(false);
    onChange(shortName, parseFloat(r.lat), parseFloat(r.lon));
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    onClear();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search location..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            className="pl-8 pr-8 h-9 text-sm"
          />
          {query && (
            <button onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {loading ? <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-xl bg-popover border border-border shadow-lg">
          {results.map((r, i) => {
            const parts = r.display_name.split(",");
            const main = parts.slice(0, 2).join(",").trim();
            const sub = parts.slice(2, 4).join(",").trim();
            return (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="flex items-start gap-2.5 w-full px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-0"
              >
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{main}</p>
                  {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PostLocationSearch;
