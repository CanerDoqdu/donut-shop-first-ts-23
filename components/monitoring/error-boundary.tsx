'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Optional fallback UI; receives the error and a reset function */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class-based Error Boundary — catches render errors in the subtree.
 *
 * Next.js `error.tsx` handles route-level errors automatically.
 * Use this component for **granular** error isolation inside pages
 * (e.g. wrapping a widget that may fail independently):
 *
 *   <ErrorBoundary>
 *     <UnstableWidget />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, send to your error tracking service (Sentry, Datadog, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-5xl">🍩</div>
          <h2 className="font-fredoka text-xl font-bold text-gray-900">
            Something broke
          </h2>
          <p className="text-sm text-gray-600 max-w-md">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <Button onClick={this.reset} size="sm">
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
