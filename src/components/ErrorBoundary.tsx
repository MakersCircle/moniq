import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center text-foreground">
          <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            The application encountered an unexpected error. This might be due to a data sync issue or a temporary glitch.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Reload Application
            </Button>
            <Button variant="outline" onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}>
              Clear Local Data
            </Button>
          </div>
          {this.state.error && (
            <pre className="mt-12 p-4 bg-muted rounded-lg text-left text-xs overflow-auto max-w-xl w-full">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

