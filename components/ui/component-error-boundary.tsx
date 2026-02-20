'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface ComponentErrorBoundaryProps {
  /** Component name for logging */
  name: string;
  /** Custom fallback — if not provided, uses default retry UI */
  fallback?: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, name: string) => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  cooldown: number;
}

// ─── Constants ──────────────────────────────────────────────────

const MAX_RETRIES = 3;

/** Exponential cooldown: 1s → 2s → 4s */
function getCooldownSec(retryCount: number): number {
  return Math.min(Math.pow(2, retryCount), 4);
}

// ─── Component ──────────────────────────────────────────────────

export class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, State> {
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, cooldown: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ComponentErrorBoundary:${this.props.name}]`, error, info.componentStack);
    this.props.onError?.(error, this.props.name);
  }

  componentWillUnmount(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  private handleRetry = (): void => {
    const nextRetry = this.state.retryCount + 1;
    const cooldownSec = getCooldownSec(this.state.retryCount);

    this.setState({
      hasError: false,
      error: null,
      retryCount: nextRetry,
      cooldown: cooldownSec,
    });

    // Start cooldown tick for the NEXT potential error
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.setState((prev) => {
        if (prev.cooldown <= 1) {
          if (this.cooldownTimer) clearInterval(this.cooldownTimer);
          return { ...prev, cooldown: 0 };
        }
        return { ...prev, cooldown: prev.cooldown - 1 };
      });
    }, 1000);
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const canRetry = this.state.retryCount < MAX_RETRIES;
    const inCooldown = this.state.cooldown > 0;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex flex-col items-center justify-center p-6 rounded-2xl bg-red-50/50 border border-red-100 min-h-[200px] text-center"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500" aria-hidden="true" />
        </div>

        <h3 className="font-semibold text-gray-900 mb-1">
          Something went wrong
        </h3>
        <p className="text-sm text-gray-600 mb-4 max-w-xs">
          The {this.props.name} section encountered an error.
          {canRetry ? ' Try again below.' : ' Please refresh the page.'}
        </p>

        {canRetry && (
          <Button
            onClick={this.handleRetry}
            disabled={inCooldown}
            size="sm"
            variant="outline"
            className="gap-2"
            aria-label={inCooldown ? `Retry available in ${this.state.cooldown} seconds` : `Retry loading ${this.props.name}`}
          >
            <RefreshCw className={`h-4 w-4 ${inCooldown ? 'animate-spin' : ''}`} aria-hidden="true" />
            {inCooldown ? `Retry in ${this.state.cooldown}s` : 'Retry'}
          </Button>
        )}

        {!canRetry && (
          <Button
            onClick={() => window.location.reload()}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh Page
          </Button>
        )}

        {this.state.retryCount >= 2 && (
          <p className="text-xs text-gray-400 mt-3">
            If this keeps happening, try refreshing the page.
          </p>
        )}
      </div>
    );
  }
}
