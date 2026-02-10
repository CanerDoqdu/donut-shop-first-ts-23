'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShowcaseItem {
  id: string;
  image: string;
  name: string;
  tagline: string;
  bgColor: string;
  glowColor: string;
}

const showcaseItems: ShowcaseItem[] = [
  {
    id: '1',
    image: '/62f07459b587a37a9d1b5f9d14f93e60.png',
    name: 'Classic Glazed',
    tagline: 'Timeless Perfection',
    bgColor: '#FFD93D',
    glowColor: 'rgba(255, 217, 61, 0.4)',
  },
  {
    id: '2',
    image: '/0ecf3d1211dc0776a8c83b01652e286f.png',
    name: 'Chocolate Bomb',
    tagline: 'Rich & Decadent',
    bgColor: '#8B4513',
    glowColor: 'rgba(139, 69, 19, 0.4)',
  },
  {
    id: '3',
    image: '/cf29a9f29438e2dcd9091ebdf9385eb1.png',
    name: 'Strawberry Bliss',
    tagline: 'Berry Delicious',
    bgColor: '#FF6BBF',
    glowColor: 'rgba(255, 107, 191, 0.4)',
  },
  {
    id: '4',
    image: '/a0f87c462026bee95d2ccf126b9bc60a.png',
    name: 'Vanilla Dream',
    tagline: 'Smooth & Creamy',
    bgColor: '#FFB380',
    glowColor: 'rgba(255, 179, 128, 0.4)',
  },
  {
    id: '5',
    image: '/9877db2dcff20bf4feec3349824f74e3.png',
    name: 'Rainbow Sprinkle',
    tagline: 'Party in Every Bite',
    bgColor: '#FF8C42',
    glowColor: 'rgba(255, 140, 66, 0.4)',
  },
];

export function ProductShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % showcaseItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const current = showcaseItems[currentIndex];

  return (
    <div className="relative flex flex-col items-center">
      {/* Magnifying Glass Frame */}
      <div className="relative">
        {/* Outer ring glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl"
          animate={{
            backgroundColor: current.glowColor,
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 320, height: 320, top: -10, left: -10 }}
        />

        {/* Glass circle */}
        <div
          className="relative flex items-center justify-center rounded-full border-[6px] border-white/40 shadow-2xl overflow-hidden"
          style={{
            width: 300,
            height: 300,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 60%), ${current.bgColor}20`,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Glass shine effect */}
          <div
            className="absolute top-4 left-8 w-16 h-16 rounded-full opacity-40"
            style={{
              background: 'radial-gradient(circle, white 0%, transparent 70%)',
            }}
          />

          {/* Animated product */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.3, opacity: 0, rotateY: 90 }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="select-none"
              style={{
                filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.2))',
              }}
            >
              <Image
                src={current.image}
                alt={current.name}
                width={220}
                height={220}
                className="object-contain"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Magnifying glass handle */}
        <div
          className="absolute -bottom-8 -right-8 w-12 h-32 rounded-full border-[6px] border-white/40"
          style={{
            transform: 'rotate(45deg)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
            backdropFilter: 'blur(10px)',
          }}
        />
      </div>

      {/* Product name below */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-12 text-center"
        >
          <h3 className="font-fredoka text-2xl font-bold text-white drop-shadow-lg">
            {current.name}
          </h3>
          <p className="text-white/80 text-lg mt-1 italic">{current.tagline}</p>
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      <div className="flex gap-2 mt-6">
        {showcaseItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setCurrentIndex(index)}
            className="transition-all duration-300"
          >
            <motion.div
              className="rounded-full"
              animate={{
                width: index === currentIndex ? 28 : 10,
                height: 10,
                backgroundColor: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
              transition={{ duration: 0.3 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
