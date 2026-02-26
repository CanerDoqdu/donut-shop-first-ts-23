'use client';

const strings = {
  en: {
    title: "You're Offline",
    description: "It looks like you've lost your internet connection. Don't worry, your donuts will be waiting when you're back online!",
    retry: 'Try Again',
  },
  tr: {
    title: 'Çevrimdışısınız',
    description: 'İnternet bağlantınız kesilmiş görünüyor. Endişelenmeyin, donutlarınız siz döndüğünüzde hazır olacak!',
    retry: 'Tekrar Dene',
  },
};

export default function OfflinePage() {
  const isTr = typeof navigator !== 'undefined' && navigator.language?.startsWith('tr');
  const t = isTr ? strings.tr : strings.en;

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-pink-50 to-orange-50">
      <div className="text-center px-6">
        <div className="text-9xl mb-6">🍩</div>
        <h1 className="text-4xl font-fredoka font-bold text-gray-900 mb-3">
          {t.title}
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          {t.description}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-linear-to-r from-pink-500 to-orange-500 text-white px-8 py-3 rounded-full font-fredoka font-bold text-lg hover:shadow-lg transition-shadow"
        >
          {t.retry}
        </button>
      </div>
    </div>
  );
}
