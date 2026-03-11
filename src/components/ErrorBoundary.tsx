import { Component, type ErrorInfo, type ReactNode } from "react";
import posthog from "../lib/posthog";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    posthog.capture("$exception", {
      $exception_message: error.message,
      $exception_stack_trace_raw: error.stack,
      $exception_type: error.name,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center", color: "#fff" }}>
          <h2>Something went wrong</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "0.5rem" }}>
            Please reload the page to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.5rem",
              background: "var(--color-accent, #007AFF)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
