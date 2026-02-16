import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight error boundary for individual page sections.
 * Unlike the top-level ErrorBoundary, this renders inline and
 * lets the rest of the page continue working.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SectionErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mb-2 h-6 w-6 text-destructive" />
          <p className="mb-1 text-sm font-medium text-foreground">
            {this.props.fallbackMessage || "This section failed to load"}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {this.state.error?.message}
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
