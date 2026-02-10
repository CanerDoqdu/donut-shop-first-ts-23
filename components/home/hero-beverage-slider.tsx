'use client';

/* ──────────────────────────────────────────────────────
   Hero Beverage Showcase — Grid-based beverage cards
   matching the donut showcase style. Glass-morphism
   cards with images, names, prices, and ratings.
   Shows 6 beverages in a 3×2 grid.
   ────────────────────────────────────────────────────── */

import Image from 'next/image';
import { useState } from 'react';
import { Star, ArrowRight, Coffee } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface BeverageItem {
  id: number;
  name: string;
  tagline: string;
  price: string;
  image: string;
  rating: number;
  color: string;
  slug: string;
}

const BEVERAGES: BeverageItem[] = [
  {
    id: 0,
    name: 'Berry Bliss',
    tagline: 'Wild berries & cream',
    price: '₺35',
    image: '/beverage 1.png',
    rating: 4.8,
    color: '#E040A0',
    slug: 'berry-bliss',
  },
  {
    id: 1,
    name: 'Orange Sunset',
    tagline: 'Fresh citrus burst',
    price: '₺30',
    image: '/beverage 2.png',
    rating: 4.7,
    color: '#FF8C42',
    slug: 'orange-sunset',
  },
  {
    id: 2,
    name: 'Caramel Swirl',
    tagline: 'Rich & indulgent',
    price: '₺40',
    image: '/beverage 3.png',
    rating: 4.9,
    color: '#D4A574',
    slug: 'caramel-swirl',
  },
  {
    id: 3,
    name: 'Mint Fresh',
    tagline: 'Cool & refreshing',
    price: '₺32',
    image: '/beverage 4.png',
    rating: 4.6,
    color: '#34D399',
    slug: 'mint-fresh',
  },
  {
    id: 4,
    name: 'Vanilla Dream',
    tagline: 'Smooth & silky',
    price: '₺38',
    image: '/beverage 5.png',
    rating: 4.8,
    color: '#F5DEB3',
    slug: 'vanilla-dream',
  },
  {
    id: 5,
    name: 'Classic Coffee',
    tagline: 'Bold & aromatic',
    price: '₺28',
    image: '/coffe.png',
    rating: 4.9,
    color: '#8B5E3C',
    slug: 'classic-coffee',
  },
];

export function HeroBeverageSlider() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="relative w-full" style={{ maxWidth: '400px' }}>

      {/* ── Section label ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="font-fredoka text-lg font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <Coffee className="h-4 w-4" /> Signature Sips
          </p>
          <p className="text-[11px] text-white/50 font-medium tracking-wide">Handcrafted beverages</p>
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

      {/* ── BEVERAGE GRID — 3×2 compact cards ── */}
      <div className="grid grid-cols-3 gap-1.5">
        {BEVERAGES.map((bev) => {
          const isHovered = hovered === bev.id;
          return (
            <Link
              key={bev.id}
              href={{ pathname: '/products/[slug]', params: { slug: bev.slug } }}
            >
              <div
                className="relative rounded-2xl p-2 pt-3 flex flex-col items-center transition-all duration-300 cursor-pointer group"
                style={{
                  background: isHovered
                    ? `linear-gradient(135deg, rgba(255,255,255,0.18), ${bev.color}15)`
                    : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isHovered ? `${bev.color}40` : 'rgba(255,255,255,0.08)'}`,
                  backdropFilter: 'blur(12px)',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? `0 8px 25px rgba(0,0,0,0.2), 0 0 20px ${bev.color}20`
                    : '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={() => setHovered(bev.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Beverage image */}
                <div className="relative w-12 h-14 mb-1 transition-transform duration-300 group-hover:scale-110 flex items-end justify-center">
                  <Image
                    src={bev.image}
                    alt={bev.name}
                    width={48}
                    height={56}
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
                  {bev.name}
                </p>

                {/* Tagline */}
                <p className="text-[9px] text-white/40 text-center leading-tight mb-1.5">
                  {bev.tagline}
                </p>

                {/* Price + Rating row */}
                <div className="flex items-center justify-between w-full px-0.5">
                  <span
                    className="text-[11px] font-bold transition-colors duration-300"
                    style={{ color: isHovered ? bev.color : 'rgba(255,255,255,0.6)' }}
                  >
                    {bev.price}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" style={{ fill: '#FFD93D', color: '#FFD93D' }} />
                    <span className="text-[10px] text-white/45">{bev.rating}</span>
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
