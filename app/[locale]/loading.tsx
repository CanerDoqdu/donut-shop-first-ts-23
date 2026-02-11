import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-4" />
        <p className="text-gray-500 font-fredoka">Loading...</p>
      </div>
    </div>
  );
}
