import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Short user-facing summary. Keep under ~6 words. */
  title?: string;
  /** Optional supporting copy explaining the failure. */
  description?: string;
  /** Called when the user taps the Retry button. */
  onRetry?: () => void;
  /** Disable the button while a retry is in flight. */
  isRetrying?: boolean;
  className?: string;
}

/**
 * Inline error state with a retry affordance.
 *
 * Use anywhere a query/mutation can fail and we'd otherwise show a blank
 * section (feeds, lists, detail panels). The default copy is intentionally
 * generic so callers can drop it in without translation work.
 *
 * Pair with React Query's `error` + `refetch`:
 *   if (query.isError) return <RetryableError onRetry={query.refetch} />;
 */
export function RetryableError({
  title = "Something went wrong",
  description = "Check your connection and try again.",
  onRetry,
  isRetrying,
  className,
}: Props) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle aria-hidden="true" className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          aria-label="Retry"
        >
          <RefreshCw
            aria-hidden="true"
            className={cn("h-4 w-4", isRetrying && "animate-spin")}
          />
          {isRetrying ? "Retrying…" : "Retry"}
        </Button>
      )}
    </div>
  );
}
