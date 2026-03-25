import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface LocationSearchProps {
  value: string;
  onChange: (name: string, lat: number, lng: number) => void;
  onClear: () => void;
}

const LocationSearch = ({ value, onChange, onClear }: LocationSearchProps) => {
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

  // Close dropdown on outside click
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        <Input
          placeholder="Search location..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="bg-black/60 border-white/20 text-white placeholder:text-white/50 rounded-full pl-9 pr-9"
          autoFocus
        />
        {query && (
          <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading ? <Loader2 className="h-4 w-4 text-white/50 animate-spin" /> : <X className="h-4 w-4 text-white/50" />}
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 right-0 z-50 max-h-48 overflow-y-auto rounded-xl bg-black/90 border border-white/15 backdrop-blur-md shadow-xl">
          {results.map((r, i) => {
            const parts = r.display_name.split(",");
            const main = parts.slice(0, 2).join(",").trim();
            const sub = parts.slice(2, 4).join(",").trim();
            return (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="flex items-start gap-2.5 w-full px-3 py-2.5 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              >
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{main}</p>
                  {sub && <p className="text-[11px] text-white/50 truncate">{sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
