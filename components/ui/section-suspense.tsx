'use client';

import { Suspense, type ReactNode } from 'react';
import { ComponentErrorBoundary } from '@/components/ui/component-error-boundary';

// ─── Section skeleton ───────────────────────────────────────────

function SectionSkeleton({ name, className }: { name: string; className?: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${name}`}
      className={`animate-pulse rounded-2xl bg-gray-100/60 ${className ?? 'min-h-[200px]'}`}
    >
      <div className="p-6 space-y-3">
        <div className="h-5 bg-gray-200/70 rounded w-1/3" />
        <div className="h-4 bg-gray-200/50 rounded w-2/3" />
        <div className="h-4 bg-gray-200/40 rounded w-1/2" />
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200/40 rounded-xl" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading {name}...</span>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────

interface SectionSuspenseProps {
  /** Section name — used for logging + fallback label */
  name: string;
  /** Optional skeleton className override */
  skeletonClassName?: string;
  /** Custom fallback node instead of skeleton */
  fallback?: ReactNode;
  /** Called when error boundary catches */
  onError?: (error: Error, name: string) => void;
  children: ReactNode;
}

// ─── Component ──────────────────────────────────────────────────

/**
 * Wraps a section with both a Suspense fallback (skeleton)
 * and a ComponentErrorBoundary (retry UI).
 *
 * Bug #4 fix: Suspense sits INSIDE ErrorBoundary so:
 * - Render errors → caught by ErrorBoundary → retry UI
 * - Async loading → caught by Suspense → skeleton
 * - Both never conflict
 *
 * Usage:
 * ```tsx
 * <SectionSuspense name="ProductGrid">
 *   <ProductGrid />
 * </SectionSuspense>
 * ```
 */
export function SectionSuspense({
  name,
  skeletonClassName,
  fallback,
  onError,
  children,
}: SectionSuspenseProps) {
  return (
    <ComponentErrorBoundary name={name} onError={onError}>
      <Suspense fallback={fallback ?? <SectionSkeleton name={name} className={skeletonClassName} />}>
        {children}
      </Suspense>
    </ComponentErrorBoundary>
  );
}
