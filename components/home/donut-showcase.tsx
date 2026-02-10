'use client';

/* ──────────────────────────────────────────────────────
   Donut Showcase — An elegant grid-based donut menu
   for the hero section. Clean cards with images, names,
   descriptions, and prices. Integrated with the hero.
   ────────────────────────────────────────────────────── */

import Image from 'next/image';
import { useState } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface DonutItem {
  id: number;
  name: string;
  tagline: string;
  price: string;
  image: string;
  rating: number;
  color: string;
  slug: string;
}

const DONUTS: DonutItem[] = [
  {
    id: 0,
    name: 'Strawberry Glazed',
    tagline: 'Fresh berry glaze',
    price: '₺45',
    image: '/donut 4.png',
    rating: 4.9,
    color: '#FF6BBF',
    slug: 'strawberry-glazed',
  },
  {
    id: 1,
    name: 'Chocolate Dream',
    tagline: 'Belgian chocolate',
    price: '₺50',
    image: '/donut 5.png',
    rating: 4.8,
    color: '#6B3E26',
    slug: 'chocolate-dream',
  },
  {
    id: 2,
    name: 'Classic Glazed',
    tagline: 'Perfectly golden',
    price: '₺40',
    image: '/donut 6.png',
    rating: 4.7,
    color: '#FF8C42',
    slug: 'classic-sugar',
  },
  {
    id: 3,
    name: 'Caramel Delight',
    tagline: 'Salted caramel bliss',
    price: '₺55',
    image: '/donut 6 (2).png',
    rating: 4.9,
    color: '#FFD93D',
    slug: 'caramel-delight',
  },
  {
    id: 4,
    name: 'Maple Bacon',
    tagline: 'Sweet & savory',
    price: '₺60',
    image: '/donut (3).png',
    rating: 4.8,
    color: '#D4A574',
    slug: 'maple-bacon',
  },
  {
    id: 5,
    name: 'Glazed Ring',
    tagline: 'Original classic',
    price: '₺38',
    image: '/donut 3.png',
    rating: 4.6,
    color: '#E8A849',
    slug: 'classic-sugar',
  },
  {
    id: 6,
    name: 'Rainbow Sprinkle',
    tagline: 'Party in a bite',
    price: '₺48',
    image: '/donut.png',
    rating: 4.7,
    color: '#A855F7',
    slug: 'rainbow-sprinkle',
  },
  {
    id: 7,
    name: 'Double Choco',
    tagline: 'Extra indulgent',
    price: '₺58',
    image: '/donut (2).png',
    rating: 4.9,
    color: '#4A2C1A',
    slug: 'double-choco',
  },
];

export function DonutShowcase() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="relative w-full" style={{ maxWidth: '560px' }}>

      {/* ── Section label ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="font-fredoka text-lg font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            Popular Picks
          </p>
          <p className="text-[11px] text-white/50 font-medium tracking-wide">Our fan favorites</p>
        </div>
        <Link href="/products">
          <div
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-white/80 text-[11px] font-semibold transition-all duration-300 hover:scale-105 hover:text-white"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            See All <ArrowRight className="h-2.5 w-2.5" />
          </div>
        </Link>
      </div>

      {/* ── DONUT GRID — 4×2 compact cards ── */}
      <div className="grid grid-cols-4 gap-1.5">
        {DONUTS.map((donut) => {
          const isHovered = hovered === donut.id;
          return (
            <Link
              key={donut.id}
              href={{ pathname: '/products/[slug]', params: { slug: donut.slug } }}
            >
              <div
                className="relative rounded-2xl p-2 pt-3 flex flex-col items-center transition-all duration-300 cursor-pointer group"
                style={{
                  background: isHovered
                    ? `linear-gradient(135deg, rgba(255,255,255,0.18), ${donut.color}15)`
                    : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isHovered ? `${donut.color}40` : 'rgba(255,255,255,0.08)'}`,
                  backdropFilter: 'blur(12px)',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? `0 8px 25px rgba(0,0,0,0.2), 0 0 20px ${donut.color}20`
                    : '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={() => setHovered(donut.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Donut image */}
                <div className="relative w-12 h-12 mb-1 transition-transform duration-300 group-hover:scale-110">
                  <Image
                    src={donut.image}
                    alt={donut.name}
                    width={48}
                    height={48}
                    className="object-contain select-none"
                    style={{
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
                    }}
                    draggable={false}
                  />
                </div>

                {/* Name */}
                <p
                  className="text-[11px] font-bold text-center leading-tight mb-0.5 transition-colors duration-300"
                  style={{ color: isHovered ? 'white' : 'rgba(255,255,255,0.85)' }}
                >
                  {donut.name}
                </p>

                {/* Tagline */}
                <p className="text-[9px] text-white/40 text-center leading-tight mb-1.5">
                  {donut.tagline}
                </p>

                {/* Price + Rating row */}
                <div className="flex items-center justify-between w-full px-0.5">
                  <span
                    className="text-[11px] font-bold transition-colors duration-300"
                    style={{ color: isHovered ? donut.color : 'rgba(255,255,255,0.6)' }}
                  >
                    {donut.price}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" style={{ fill: '#FFD93D', color: '#FFD93D' }} />
                    <span className="text-[10px] text-white/45">{donut.rating}</span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
