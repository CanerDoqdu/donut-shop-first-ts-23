import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-4">🕳️</div>
        <h1 className="font-fredoka text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="font-fredoka text-xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          This donut seems to have disappeared! Let&apos;s get you back on track.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-amber-500 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
