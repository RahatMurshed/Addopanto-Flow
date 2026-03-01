import { Component, type ErrorInfo, type ReactNode } from "react";
import { Sentry } from "@/lib/sentry";
import { logger } from "@/utils/logger";
import { AlertTriangle, RefreshCw, Shield, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

interface Props {
  children: ReactNode;
  routeName: string;
  fallbackPath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  lastErrorTime: Date | null;
}

/**
 * Specialised error boundary for critical routes (financial data, student records).
 * - 2 auto-retries with exponential backoff (1 s → 2 s)
 * - Rich fallback UI with route context and safe-navigation option
 * - Destructive toast on every caught error
 */
export class CriticalRouteErrorBoundary extends Component<Props, State> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, lastErrorTime: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, lastErrorTime: new Date() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`CriticalRouteErrorBoundary [${this.props.routeName}]:`, error, errorInfo);
    Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });

    toast({
      variant: "destructive",
      title: `${this.props.routeName} error`,
      description: error.message?.slice(0, 120) || "A critical section failed to load",
    });

    if (this.state.retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, this.state.retryCount);
      this.retryTimeout = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
        }));
      }, delay);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
  }

  handleReset = () => {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.setState({ hasError: false, error: null, retryCount: 0, lastErrorTime: null });
  };

  handleNavigateToSafety = () => {
    window.location.href = this.props.fallbackPath || "/dashboard";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.retryCount >= MAX_RETRIES) {
      const safePath = this.props.fallbackPath || "/dashboard";
      const safeLabel = safePath === "/dashboard" ? "Dashboard" : "Safety";

      return (
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <Card className="w-full max-w-lg">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 rounded-full bg-destructive/10 p-4">
                <Shield className="h-8 w-8 text-destructive" />
              </div>

              <h2 className="mb-1 text-lg font-semibold text-foreground">
                {this.props.routeName} failed to load
              </h2>

              <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                This critical section encountered an error. Automatic recovery failed after{" "}
                {MAX_RETRIES} attempts.
              </p>

              {this.state.error && (
                <pre className="mb-4 max-w-full overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
                  {this.state.error.message?.slice(0, 120)}
                </pre>
              )}

              <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Retries: {this.state.retryCount}/{MAX_RETRIES}</span>
                {this.state.lastErrorTime && (
                  <span>Last error: {this.state.lastErrorTime.toLocaleTimeString()}</span>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={this.handleReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="secondary" onClick={this.handleNavigateToSafety}>
                  <Home className="mr-2 h-4 w-4" />
                  Go to {safeLabel}
                </Button>
                <Button onClick={this.handleReload}>
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
