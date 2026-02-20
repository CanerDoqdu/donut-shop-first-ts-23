export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
      {/* Animated donut spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-amber-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 animate-spin" />
        <div className="absolute inset-2.5 rounded-full bg-white" />
      </div>

      {/* Skeleton content blocks */}
      <div className="w-full max-w-2xl space-y-4">
        <div className="h-8 bg-amber-100/60 rounded-xl w-1/3 mx-auto animate-pulse" />
        <div className="h-4 bg-amber-100/40 rounded-lg w-2/3 mx-auto animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-20 h-20 rounded-full bg-amber-100/60 mx-auto mb-3 animate-pulse" />
              <div className="h-3 bg-amber-100/40 rounded w-3/4 mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
