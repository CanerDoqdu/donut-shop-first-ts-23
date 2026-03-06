'use client';

import dynamic from 'next/dynamic';

const DonutConveyor = dynamic(
  () => import('@/components/home/donut-conveyor').then((m) => m.DonutConveyor),
  { ssr: false, loading: () => <div style={{ height: '120px', background: '#FFF8E7' }} /> },
);

export function ConveyorLoader() {
  return <DonutConveyor />;
}
