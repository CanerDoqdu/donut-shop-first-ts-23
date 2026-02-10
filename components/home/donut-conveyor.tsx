'use client';

/* ──────────────────────────────────────────────────────
   Donut Conveyor Belt — Factory production line.

   Empty donuts enter from the LEFT → travel RIGHT to the
   oven → bake for 3 seconds → decorated donut exits RIGHT.
   Belt moves RIGHT (matching donut travel direction).
   Oven is a realistic brick oven with glow + chimney.
   ────────────────────────────────────────────────────── */

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

const DECORATED_DONUTS = [
  '/donut 4.png',
  '/donut 5.png',
  '/donut 6.png',
  '/donut (3).png',
  '/donut 3.png',
  '/donut.png',
  '/donut (2).png',
  '/donut 6 (2).png',
];

interface BeltDonut {
  id: string;
  type: 'empty' | 'decorated';
  image: string;
  x: number;
  opacity: number;
}

const OVEN_X = 50;       // oven centered at 50%
const BELT_SPEED = 3.5;  // slow & steady
const DONUT_SIZE = 48;
const BELT_H = 26;       // belt strip height
const SEG_W = 3;         // roller segment width
const SEG_GAP = 16;      // gap between segments
const SEG_UNIT = SEG_W + SEG_GAP; // one repeating unit

export function DonutConveyor() {
  const [donuts, setDonuts] = useState<BeltDonut[]>([]);
  const [machineState, setMachineState] = useState<'idle' | 'processing' | 'done'>('idle');
  const idRef = useRef(0);
  const animFrame = useRef<number | null>(null);
  const lastTime = useRef(0);
  const machineTimer = useRef<NodeJS.Timeout | null>(null);
  const spawnTimer = useRef<NodeJS.Timeout | null>(null);

  /* spawn an empty donut just off-screen LEFT */
  const spawnEmpty = useCallback(() => {
    idRef.current += 1;
    const id = `e-${idRef.current}`;
    setDonuts((prev) => [...prev, {
      id,
      type: 'empty' as const,
      image: '/donut-empty.png',
      x: -6,
      opacity: 1,
    }]);
  }, []);

  /* spawn a decorated donut inside the oven — emerges from behind it */
  const spawnDecorated = useCallback(() => {
    idRef.current += 1;
    const id = `d-${idRef.current}`;
    const img = DECORATED_DONUTS[Math.floor(Math.random() * DECORATED_DONUTS.length)];
    setDonuts((prev) => [...prev, {
      id,
      type: 'decorated' as const,
      image: img,
      x: OVEN_X - 1,
      opacity: 1,
    }]);
  }, []);

  /* animation loop — move donuts LEFT→RIGHT */
  useEffect(() => {
    const tick = (time: number) => {
      if (!lastTime.current) lastTime.current = time;
      const dt = (time - lastTime.current) / 1000;
      lastTime.current = time;

      setDonuts((prev) => {
        let needMachine = false;
        const updated = prev
          .map((d) => {
            const newD = { ...d };
            newD.x = d.x + BELT_SPEED * dt;

            if (d.type === 'empty') {
              // reached the oven → consume
              if (newD.x >= OVEN_X - 2) {
                needMachine = true;
                return null;
              }
            } else {
              // decorated donut exits right
              if (newD.x > 110) return null;
            }
            return newD;
          })
          .filter(Boolean) as BeltDonut[];

        if (needMachine) {
          setTimeout(() => setMachineState('processing'), 0);
        }
        return updated;
      });

      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current); };
  }, []);

  /* oven state machine */
  useEffect(() => {
    if (machineState === 'processing') {
      machineTimer.current = setTimeout(() => {
        setMachineState('done');
      }, 3000);
    } else if (machineState === 'done') {
      machineTimer.current = setTimeout(() => {
        spawnDecorated();
        setMachineState('idle');
      }, 500);
    }
    return () => { if (machineTimer.current) clearTimeout(machineTimer.current); };
  }, [machineState, spawnDecorated]);

  /* initial spawn + timer */
  useEffect(() => {
    const timeout = setTimeout(() => spawnEmpty(), 0);
    spawnTimer.current = setInterval(spawnEmpty, 6500);
    return () => { clearTimeout(timeout); if (spawnTimer.current) clearInterval(spawnTimer.current); };
  }, [spawnEmpty]);

  return (
    <div 
      className="relative overflow-hidden select-none" 
      style={{ 
        height: '120px',
        background: '#FFF8E7',
      }}
    >
      {/* ── Factory wall background (starts below top belt) ── */}
      <div 
        className="absolute left-0 right-0 bottom-0 pointer-events-none"
        style={{
          top: '33px',
          background: 'linear-gradient(180deg, #3D2418 0%, #2D1810 50%, #1F100A 100%)',
        }}
      />
      
      {/* ── Second belt (decorative back belt) ── */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: '15px',
          height: '18px',
          background: 'linear-gradient(180deg, #8B6544 0%, #6E4F35 50%, #5A3D28 100%)',
          borderTop: '2px solid #A67B5B',
          borderBottom: '2px solid #4A2A1A',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
        }}
      />
      
      {/* ── Back belt roller segments ── */}
      <div
        className="absolute left-0 right-0 overflow-hidden"
        style={{
          top: '15px',
          height: '18px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `calc(100% + ${SEG_UNIT}px)`,
            height: '100%',
            backgroundImage: `repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.08) 0px,
              rgba(255,255,255,0.08) ${SEG_W}px,
              transparent ${SEG_W}px,
              transparent ${SEG_UNIT}px
            )`,
            backgroundSize: `${SEG_UNIT}px 100%`,
            animation: `beltMoveRight ${SEG_UNIT / (BELT_SPEED * 6)}s linear infinite`,
          }}
        />
      </div>
      
      {/* ── Support pillars ── */}
      {[15, 35, 55, 75, 95].map((pos) => (
        <div
          key={pos}
          className="absolute"
          style={{
            left: `${pos}%`,
            top: '33px',
            width: '8px',
            height: '50px',
            background: 'linear-gradient(90deg, #5A3D28 0%, #8B6544 50%, #5A3D28 100%)',
            borderRadius: '2px',
            boxShadow: '2px 0 4px rgba(0,0,0,0.3)',
          }}
        />
      ))}

      {/* ── Belt body — thick rubber strip with side rails ── */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 0,
          height: `${BELT_H + 8}px`,
          background: 'linear-gradient(180deg, #C8956E 0%, #A67B5B 30%, #8B6544 60%, #6E4F35 100%)',
          borderTop: '3px solid #D4A574',
          boxShadow: 'inset 0 3px 8px rgba(74,44,26,0.4), 0 -1px 4px rgba(74,44,26,0.3)',
        }}
      />

      {/* ── Belt surface ── */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 4,
          height: `${BELT_H}px`,
          background: 'linear-gradient(180deg, #D4A574 0%, #B8895A 40%, #9B7348 100%)',
          borderTop: '2px solid #E8C9A0',
          boxShadow: 'inset 0 2px 6px rgba(74,44,26,0.35)',
        }}
      />

      {/* Belt roller segments — seamless right-scroll via CSS background */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 4,
          height: `${BELT_H}px`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `calc(100% + ${SEG_UNIT}px)`,
            height: '100%',
            backgroundImage: `repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.12) 0px,
              rgba(255,255,255,0.12) ${SEG_W}px,
              transparent ${SEG_W}px,
              transparent ${SEG_UNIT}px
            )`,
            backgroundSize: `${SEG_UNIT}px 100%`,
            animation: `beltMoveRight ${SEG_UNIT / (BELT_SPEED * 6)}s linear infinite`,
          }}
        />
      </div>

      {/* Belt top rail */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: `${BELT_H + 4}px`,
          height: '3px',
          background: 'linear-gradient(180deg, #E8C9A0, #C8956E)',
        }}
      />
      {/* Belt top shine */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: `${BELT_H + 7}px`,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 5%, rgba(232,201,160,0.35) 30%, rgba(255,240,220,0.18) 50%, rgba(232,201,160,0.35) 70%, transparent 95%)',
        }}
      />

      {/* ── Donuts on belt (sitting right on top) ── */}
      {donuts.map((d) => (
        <div
          key={d.id}
          className="absolute"
          style={{
            left: `${d.x}%`,
            bottom: d.type === 'empty' ? `${BELT_H}px` : `${BELT_H + 4}px`,
            width: `${DONUT_SIZE}px`,
            height: `${DONUT_SIZE}px`,
            zIndex: 2,
          }}
        >
          <Image
            src={d.image}
            alt={d.type === 'empty' ? 'Plain donut' : 'Decorated donut'}
            fill
            sizes="48px"
            className="object-contain"
            style={{
              filter: d.type === 'decorated'
                ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))'
                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3)) brightness(0.92)',
            }}
            draggable={false}
          />
        </div>
      ))}

      {/* ── THE OVEN ── */}
      <div
        className="absolute"
        style={{
          left: `${OVEN_X}%`,
          transform: 'translateX(-50%)',
          bottom: 0,
          width: '120px',
          height: '105px',
          zIndex: 5,
        }}
      >
        <div className="relative w-full h-full">
          {/* Oven body — NO top gradient leak, clean rounded top */}
          <div
            className="absolute inset-0"
            style={{
              background: '#6B3410',
              borderRadius: '14px 14px 0 0',
              border: '2px solid #A0522D',
              borderBottom: 'none',
              overflow: 'hidden',
              boxShadow: '0 -2px 12px rgba(0,0,0,0.4)',
            }}
          >
            {/* Inner brick gradient — fully contained */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, #8B5522 0%, #6B3410 30%, #4A2408 70%, #3A1A06 100%)',
            }} />
            {/* Brick pattern overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                opacity: 0.12,
                backgroundImage: `
                  repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(0,0,0,0.3) 14px, rgba(0,0,0,0.3) 16px),
                  repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(0,0,0,0.2) 28px, rgba(0,0,0,0.2) 30px)
                `,
              }}
            />
          </div>

          {/* Oven arch opening */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: 0,
              width: '55px',
              height: '46px',
              background: machineState === 'processing'
                ? 'radial-gradient(ellipse at 50% 100%, #FF4500 0%, #CC3300 40%, #1a0e08 80%)'
                : 'radial-gradient(ellipse at 50% 100%, #2a1a10 0%, #1a0e08 60%)',
              borderRadius: '28px 28px 0 0',
              boxShadow: machineState === 'processing'
                ? 'inset 0 0 18px rgba(255,69,0,0.6), 0 0 12px rgba(255,69,0,0.25)'
                : 'inset 0 0 10px rgba(0,0,0,0.8)',
              transition: 'all 0.5s',
            }}
          />

          {/* Fire glow when processing */}
          {machineState === 'processing' && (
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                bottom: '2px',
                width: '44px',
                height: '18px',
                background: 'radial-gradient(ellipse at 50% 100%, rgba(255,150,0,0.8), transparent 70%)',
                animation: 'ovenFlicker 0.3s ease-in-out infinite alternate',
                borderRadius: '50%',
              }}
            />
          )}

          {/* Smoke */}
          {machineState === 'processing' && (
            <>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${6 + i * 3}px`,
                    height: `${6 + i * 3}px`,
                    background: 'rgba(200,200,200,0.3)',
                    right: `${20 + i * 3}px`,
                    top: '-22px',
                    animation: `smokeRise ${1.5 + i * 0.4}s ${i * 0.3}s ease-out infinite`,
                  }}
                />
              ))}
            </>
          )}

          {/* Label */}
          <div
            className="absolute left-1/2 -translate-x-1/2 font-fredoka text-[7px] font-bold tracking-[0.2em] uppercase"
            style={{ top: '9px', color: 'rgba(255,200,140,0.45)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            OVEN
          </div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes beltMoveRight {
          0% { transform: translateX(0); }
          100% { transform: translateX(${SEG_UNIT}px); }
        }
        @keyframes ovenFlicker {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes smokeRise {
          0% { transform: translateY(0) scale(1); opacity: 0.35; }
          100% { transform: translateY(-30px) scale(2.5); opacity: 0; }
        }
      `}} />
    </div>
  );
}
