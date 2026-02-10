import StoreFinder from '@/components/stores/StoreFinder';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function StoresPage({ params }: Props) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <StoreFinder locale={locale as 'tr' | 'en'} />
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;

  return {
    title: locale === 'tr' ? 'Mağazalarımız | Donut Shop' : 'Our Stores | Donut Shop',
    description: locale === 'tr' 
      ? 'Size en yakın Donut Shop mağazasını bulun' 
      : 'Find the nearest Donut Shop location',
  };
}
