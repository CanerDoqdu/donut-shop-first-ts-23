/**
 * Skeleton placeholder for the products grid.
 * Used as Suspense fallback and in route-level loading.tsx.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Title skeleton */}
      <div className="text-center mb-12">
        <div className="h-10 w-56 bg-amber-100/60 rounded-xl mx-auto mb-4 animate-pulse" />
        <div className="h-4 w-80 bg-amber-100/40 rounded-lg mx-auto animate-pulse" />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-8 space-y-4">
        <div className="h-10 w-full max-w-md mx-auto bg-gray-100 rounded-xl animate-pulse" />
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
      </div>

      {/* Product cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-full aspect-square rounded-2xl bg-amber-100/40 mb-4 animate-pulse" />
            <div className="h-5 w-3/4 bg-gray-100 rounded mx-auto mb-2 animate-pulse" />
            <div className="h-3 w-full bg-gray-100/60 rounded mb-3 animate-pulse" />
            <div className="flex justify-between mb-3">
              <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-pink-100/60 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-10 w-full bg-amber-100/40 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
