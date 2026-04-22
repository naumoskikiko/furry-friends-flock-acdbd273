import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportCrash } from "@/lib/crashReporter";

interface Props {
  children: ReactNode;
  /** Optional friendly label for the area being protected (e.g. "Messages"). */
  area?: string;
  /** Optional custom fallback override. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Global error boundary. Catches render-time exceptions in the component tree
 * below it and shows a recoverable UI instead of a blank white screen.
 *
 * Use one near the app root and optionally per-route or per-feature for
 * graceful, scoped recovery. App-store reviewers commonly reject apps that
 * white-screen on errors — this prevents that.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Funnel through the central reporter so route/user/version context is
    // attached and (in production) the report can be shipped to a sink.
    reportCrash("react-error-boundary", error, {
      area: this.props.area,
      componentStack: info.componentStack ?? undefined,
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { children, fallback, area } = this.props;

    if (!error) return children;
    if (fallback) return fallback(error, this.reset);

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {area ? `We hit an unexpected issue while loading ${area}.` : "We hit an unexpected issue."}{" "}
            You can try again — your data is safe.
          </p>
        </div>
        <Button onClick={this.reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }
}

export default ErrorBoundary;
