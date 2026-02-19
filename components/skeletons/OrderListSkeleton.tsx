/**
 * Skeleton placeholder for the orders list.
 * Used as Suspense fallback and in route-level loading.tsx.
 */
export function OrderListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2 animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Order cards skeleton */}
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="h-5 w-40 bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-amber-100/60 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between">
                <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-5 w-24 bg-pink-100/60 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
