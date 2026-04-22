import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Copy,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * Crash report row from `public.crash_reports`. Kept loose because the table
 * is intentionally outside the generated Supabase types client (`(supabase as any)`).
 */
interface CrashReport {
  id: string;
  source: string;
  message: string;
  stack: string | null;
  area: string | null;
  component_stack: string | null;
  route: string | null;
  user_id: string | null;
  user_agent: string | null;
  app_version: string | null;
  build_id: string | null;
  extra: Record<string, unknown> | null;
  client_timestamp: string | null;
  created_at: string;
}

type SourceFilter = "all" | "react-error-boundary" | "window-error" | "unhandled-rejection" | "manual";

const SOURCE_LABEL: Record<string, string> = {
  "react-error-boundary": "Boundary",
  "window-error": "Window",
  "unhandled-rejection": "Promise",
  manual: "Manual",
};

const PAGE_SIZE = 50;

/**
 * Triage panel for production crashes.
 *
 * Why this exists: the `ingest-crash` edge function dumps every uncaught
 * error into `crash_reports`, but raw rows are useless without a way to
 * group by version, route, and user. This panel gives owners/admins a quick
 * "what's burning right now" view without leaving the app.
 *
 * Reads only — no mutations. RLS already restricts SELECT to owners/admins,
 * so an unauthorized fetch returns an empty list (no leakage, no crash).
 */
const CrashReportsPanel = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<CrashReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReports = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);

    // Untyped table access — `crash_reports` was added in the latest migration
    // and the generated types haven't picked it up yet in this snapshot.
    const { data, error } = await (supabase as any)
      .from("crash_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      // Surface to the toast so admins know if RLS blocked them rather than
      // silently showing "no crashes" (which would be misleadingly reassuring).
      toast({
        title: "Failed to load crash reports",
        description: error.message,
        variant: "destructive",
      });
      setReports([]);
    } else {
      setReports((data ?? []) as CrashReport[]);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchReports("initial");
  }, []);

  // Client-side filter on the latest page. Anything older requires a new
  // server fetch — keeps the panel snappy without paginating UI.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        r.message.toLowerCase().includes(q) ||
        (r.route ?? "").toLowerCase().includes(q) ||
        (r.app_version ?? "").toLowerCase().includes(q) ||
        (r.area ?? "").toLowerCase().includes(q)
      );
    });
  }, [reports, search, sourceFilter]);

  // Counts for the tab labels — purely from the loaded page so it always
  // reflects what the user can see.
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: reports.length };
    for (const r of reports) {
      counts[r.source] = (counts[r.source] ?? 0) + 1;
    }
    return counts;
  }, [reports]);

  const copyReport = (r: CrashReport) => {
    const text = [
      `[${r.source}] ${r.message}`,
      `Route: ${r.route ?? "—"}`,
      `Version: ${r.app_version ?? "—"} (${r.build_id ?? "—"})`,
      `User: ${r.user_id ?? "anonymous"}`,
      `Time: ${r.created_at}`,
      r.area ? `Area: ${r.area}` : null,
      r.stack ? `\nStack:\n${r.stack}` : null,
      r.component_stack ? `\nComponent stack:\n${r.component_stack}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Crash report copied" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Loading crash reports">
        <div aria-hidden="true" className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-destructive/10 to-amber-500/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="h-5 w-5 text-destructive" />
            <p className="text-sm font-bold">Crash Reports</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchReports("refresh")}
            disabled={refreshing}
            aria-label="Refresh crash reports"
          >
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Latest {PAGE_SIZE} reports from production. Visible to owners and admins only.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by message, route, version…"
            className="pl-9"
            aria-label="Search crash reports"
          />
        </div>
        <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All ({sourceCounts.all ?? 0})</TabsTrigger>
            <TabsTrigger value="react-error-boundary">
              Boundary ({sourceCounts["react-error-boundary"] ?? 0})
            </TabsTrigger>
            <TabsTrigger value="window-error">
              Window ({sourceCounts["window-error"] ?? 0})
            </TabsTrigger>
            <TabsTrigger value="unhandled-rejection">
              Promise ({sourceCounts["unhandled-rejection"] ?? 0})
            </TabsTrigger>
            <TabsTrigger value="manual">Manual ({sourceCounts.manual ?? 0})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <p className="text-sm font-semibold">🎉 No crashes match your filters</p>
          <p className="text-xs text-muted-foreground mt-1">
            {reports.length === 0
              ? "Production is quiet — or you don't have access to view reports."
              : "Try clearing the search or switching tabs."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const isOpen = expandedId === r.id;
            const time = formatDistanceToNow(new Date(r.created_at), { addSuffix: true });
            return (
              <li
                key={r.id}
                className="rounded-xl bg-card border border-border overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : r.id)}
                  className="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-secondary/40 transition-colors"
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} crash report: ${r.message.slice(0, 80)}`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
                    <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {SOURCE_LABEL[r.source] ?? r.source}
                      </span>
                      {r.area && (
                        <span className="text-[10px] font-semibold text-primary">{r.area}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{time}</span>
                    </div>
                    <p className="text-sm font-semibold mt-1 break-words line-clamp-2">{r.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      {r.route && <span className="font-mono">{r.route}</span>}
                      {r.app_version && (
                        <span className="font-mono">
                          v{r.app_version}
                          {r.build_id ? ` · ${r.build_id}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-secondary/20 px-3 py-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <Field label="Source" value={r.source} />
                      <Field label="Time" value={new Date(r.created_at).toLocaleString()} />
                      <Field label="User" value={r.user_id ?? "anonymous"} mono />
                      <Field label="Build" value={r.build_id ?? "—"} mono />
                      <Field label="UA" value={r.user_agent ?? "—"} mono className="col-span-2" />
                    </div>

                    {r.stack && (
                      <details className="rounded-lg bg-background border border-border p-2">
                        <summary className="text-[11px] font-bold cursor-pointer">Stack trace</summary>
                        <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-64 overflow-auto">
                          {r.stack}
                        </pre>
                      </details>
                    )}

                    {r.component_stack && (
                      <details className="rounded-lg bg-background border border-border p-2">
                        <summary className="text-[11px] font-bold cursor-pointer">Component stack</summary>
                        <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-64 overflow-auto">
                          {r.component_stack}
                        </pre>
                      </details>
                    )}

                    {r.extra && Object.keys(r.extra).length > 0 && (
                      <details className="rounded-lg bg-background border border-border p-2">
                        <summary className="text-[11px] font-bold cursor-pointer">Extra metadata</summary>
                        <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-64 overflow-auto">
                          {JSON.stringify(r.extra, null, 2)}
                        </pre>
                      </details>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyReport(r)}
                      className="w-full"
                      aria-label="Copy crash report to clipboard"
                    >
                      <Copy aria-hidden="true" className="h-3.5 w-3.5 mr-1.5" />
                      Copy report
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const Field = ({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) => (
  <div className={className}>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-[11px] font-semibold break-all ${mono ? "font-mono" : ""}`}>{value}</p>
  </div>
);

export default CrashReportsPanel;
