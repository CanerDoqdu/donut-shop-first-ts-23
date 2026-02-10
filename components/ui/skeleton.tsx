'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button' | 'image' | 'donut';
}

function Skeleton({ className, variant = 'default' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-linear-to-r from-amber-100 via-amber-50 to-amber-100 bg-size-[200%_100%]';
  
  const variantClasses = {
    default: 'rounded-md',
    card: 'rounded-2xl',
    text: 'rounded h-4',
    avatar: 'rounded-full',
    button: 'rounded-xl h-12',
    image: 'rounded-xl aspect-square',
    donut: 'rounded-full aspect-square',
  };

  return (
    <div 
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{
        animation: 'shimmer 2s infinite linear',
      }}
    />
  );
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <Skeleton variant="donut" className="w-32 h-32 mx-auto mb-4" />
      <Skeleton variant="text" className="w-3/4 mx-auto mb-2" />
      <Skeleton variant="text" className="w-1/2 mx-auto mb-4 h-3" />
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-16 h-6" />
        <Skeleton variant="button" className="w-24 h-10" />
      </div>
    </div>
  );
}

// Product Grid Skeleton
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Hero Section Skeleton
export function HeroSkeleton() {
  return (
    <div className="relative min-h-150 flex items-center justify-center">
      <div className="absolute inset-0 bg-linear-to-br from-amber-50 to-pink-50 animate-pulse" />
      <div className="relative z-10 text-center space-y-6 p-8">
        <Skeleton variant="text" className="w-64 h-12 mx-auto" />
        <Skeleton variant="text" className="w-96 h-6 mx-auto" />
        <div className="flex gap-4 justify-center">
          <Skeleton variant="button" className="w-32" />
          <Skeleton variant="button" className="w-32" />
        </div>
      </div>
    </div>
  );
}

// Store Card Skeleton
export function StoreCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="text" className="w-40 h-6 mb-2" />
          <Skeleton variant="text" className="w-24 h-4" />
        </div>
        <Skeleton variant="text" className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton variant="text" className="w-full h-4 mb-2" />
      <Skeleton variant="text" className="w-32 h-4 mb-4" />
      <div className="flex gap-2">
        <Skeleton variant="button" className="flex-1 h-10" />
        <Skeleton variant="button" className="flex-1 h-10" />
      </div>
    </div>
  );
}

// Store Grid Skeleton
export function StoreGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StoreCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Cart Item Skeleton
export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100">
      <Skeleton variant="donut" className="w-20 h-20 shrink-0" />
      <div className="flex-1">
        <Skeleton variant="text" className="w-32 h-5 mb-2" />
        <Skeleton variant="text" className="w-20 h-4 mb-3" />
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="w-24 h-8" />
          <Skeleton variant="text" className="w-16 h-6" />
        </div>
      </div>
    </div>
  );
}

// Order Summary Skeleton
export function OrderSummarySkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <Skeleton variant="text" className="w-32 h-6 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between">
            <Skeleton variant="text" className="w-24 h-4" />
            <Skeleton variant="text" className="w-16 h-4" />
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 mt-4 pt-4">
        <div className="flex justify-between">
          <Skeleton variant="text" className="w-16 h-6" />
          <Skeleton variant="text" className="w-20 h-6" />
        </div>
      </div>
      <Skeleton variant="button" className="w-full mt-6" />
    </div>
  );
}

// Dashboard Stats Skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="avatar" className="w-12 h-12" />
            <Skeleton variant="text" className="w-12 h-4" />
          </div>
          <Skeleton variant="text" className="w-20 h-8 mb-2" />
          <Skeleton variant="text" className="w-24 h-4" />
        </div>
      ))}
    </div>
  );
}

// Notification Skeleton
export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b border-gray-100">
      <Skeleton variant="avatar" className="w-10 h-10 shrink-0" />
      <div className="flex-1">
        <Skeleton variant="text" className="w-3/4 h-4 mb-2" />
        <Skeleton variant="text" className="w-1/2 h-3" />
      </div>
    </div>
  );
}

// Profile Skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton variant="avatar" className="w-20 h-20" />
        <div>
          <Skeleton variant="text" className="w-40 h-6 mb-2" />
          <Skeleton variant="text" className="w-48 h-4" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton variant="text" className="w-24 h-4 mb-2" />
            <Skeleton variant="text" className="w-full h-12 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Gift Card Skeleton
export function GiftCardSkeleton() {
  return (
    <div className="bg-linear-to-br from-amber-100 to-pink-100 rounded-2xl p-6 animate-pulse">
      <Skeleton variant="text" className="w-32 h-6 mb-4 bg-white/50" />
      <Skeleton variant="text" className="w-48 h-10 mb-6 bg-white/50" />
      <div className="flex justify-between items-end">
        <Skeleton variant="text" className="w-24 h-4 bg-white/50" />
        <Skeleton variant="text" className="w-20 h-8 bg-white/50" />
      </div>
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="text" className="flex-1 h-4" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-50">
          <div className="flex gap-4 items-center">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} variant="text" className="flex-1 h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Full Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50/50 to-white">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Skeleton variant="text" className="w-48 h-10 mx-auto" />
        <Skeleton variant="text" className="w-64 h-4 mx-auto" />
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}

// Add shimmer animation to global styles
export const skeletonStyles = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export { Skeleton };
