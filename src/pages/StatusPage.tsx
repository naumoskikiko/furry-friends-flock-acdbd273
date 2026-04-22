import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_VERSION, APP_BUILD_ID } from "@/lib/appVersion";

/**
 * Public service-status page.
 *
 * Pulls the `health` edge function and renders a per-component status grid.
 * Intentionally does NOT require auth — App Store and Play Store reviewers
 * (and end users debugging an outage) need to reach this without signing in.
 *
 * The endpoint always returns HTTP 200 with a structured body, so we treat
 * a network-level failure as "down" but only when fetch itself rejects.
 */

type ComponentStatus = "ok" | "degraded" | "down";

interface HealthResponse {
  status: ComponentStatus;
  checked_at: string;
  components: Record<string, { status: ComponentStatus; latency_ms: number; error?: string }>;
}

const STATUS_LABEL: Record<ComponentStatus, string> = {
  ok: "Operational",
  degraded: "Degraded performance",
  down: "Outage",
};

function StatusIcon({ status }: { status: ComponentStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />;
  if (status === "degraded") return <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />;
  return <XCircle className="h-5 w-5 text-destructive" aria-hidden />;
}

export default function StatusPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health`;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

    // 6s timeout — health is supposed to answer in <2s; longer means trouble.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6_000);

    fetch(url, {
      headers: { apikey, Authorization: `Bearer ${apikey}` },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: HealthResponse) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (cancelled) return;
        // Network failure — treat as down, but show a friendly message.
        setError(e instanceof Error ? e.message : "Could not reach status endpoint");
      })
      .finally(() => {
        clearTimeout(t);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [refreshKey]);

  // Effective overall status: if fetch failed, force "down".
  const overall: ComponentStatus = error ? "down" : data?.status ?? "ok";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            aria-label="Back to home"
            className="rounded-full p-2 text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">System Status</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Overall banner — color via semantic tokens so dark mode is handled. */}
        <Card
          className={`flex items-center gap-3 p-5 ${
            overall === "ok"
              ? "border-primary/30 bg-primary/5"
              : overall === "degraded"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <StatusIcon status={overall} />
          <div className="flex-1">
            <p className="text-base font-semibold">
              {loading ? "Checking…" : STATUS_LABEL[overall]}
            </p>
            <p className="text-xs text-muted-foreground">
              {data?.checked_at
                ? `Last checked ${new Date(data.checked_at).toLocaleTimeString()}`
                : error ?? "Pinging backend…"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRefreshKey((k) => k + 1)}
            aria-label="Refresh status"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </Card>

        {/* Component grid. We render placeholders during the first load so
            the page never looks blank for store reviewers. */}
        <Card className="divide-y divide-border">
          {(data
            ? Object.entries(data.components)
            : ([
                ["database", { status: "ok", latency_ms: 0 }],
                ["functions", { status: "ok", latency_ms: 0 }],
              ] as const)
          ).map(([name, comp]) => (
            <div key={name} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <StatusIcon status={comp.status} />
                <span className="capitalize">{name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {loading
                  ? "—"
                  : comp.status === "down"
                    ? "Offline"
                    : `${comp.latency_ms}ms`}
              </span>
            </div>
          ))}
        </Card>

        <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
          <p>
            App version{" "}
            <span className="font-mono text-foreground">{APP_VERSION}</span> · build{" "}
            <span className="font-mono text-foreground">{APP_BUILD_ID}</span>
          </p>
          <p className="mt-2">
            For ongoing issues, contact{" "}
            <a className="underline" href="mailto:support@petkeepapp.com">
              support@petkeepapp.com
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
