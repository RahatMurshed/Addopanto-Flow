import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/utils/logger";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const MAX_RETRIES = 2;
const RETRY_DELAY = 500;

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Lightweight error boundary for individual page sections.
 * Auto-retries up to 2 times before showing inline fallback.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("SectionErrorBoundary caught:", error, errorInfo);

    toast({
      variant: "destructive",
      title: "Section error",
      description: error.message?.slice(0, 120) || "A section failed to load",
    });

    if (this.state.retryCount < MAX_RETRIES) {
      this.retryTimeout = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
        }));
      }, RETRY_DELAY);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, retryCount: 0 });
  };

  render() {
    if (this.state.hasError && this.state.retryCount >= MAX_RETRIES) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mb-2 h-6 w-6 text-destructive" />
          <p className="mb-1 text-sm font-medium text-foreground">
            {this.props.fallbackMessage || "This section failed to load"}
          </p>
          <p className="mb-1 text-xs text-muted-foreground">
            {this.state.error?.message}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Failed after {MAX_RETRIES} automatic retries
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCw className="mr-1.5 h-3 w-3" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
