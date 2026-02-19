/**
 * Skeleton placeholder for the admin dashboard.
 * Used as Suspense fallback and in route-level loading.tsx.
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar skeleton */}
        <div className="w-64 min-h-screen bg-white border-r p-4 hidden lg:block">
          <div className="h-8 w-40 bg-gray-200 rounded-lg mb-8 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 p-6">
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="w-10 h-10 rounded-xl bg-amber-100/40 animate-pulse" />
                </div>
                <div className="h-8 w-24 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Chart placeholder */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-6 animate-pulse" />
            <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
          </div>

          {/* Table placeholder */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-amber-100/40 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
