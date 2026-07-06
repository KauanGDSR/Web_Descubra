'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

const PHRASES = [
  "Construindo o seu acesso ao mundo do trabalho...",
  "Mais de 1.600 jovens já participaram do programa...",
  "Articulando a rede de proteção social...",
  "Transformando barreiras em oportunidades..."
];

const COLORS = ['#F97316', '#10B981', '#EC4899', '#38BDF8', '#FBBF24', '#8B5CF6', '#F43F5E', '#14B8A6'];

const START_POS = [
  { x: -200, y: -300, r: -45 }, { x: 150, y: -250, r: 30 }, { x: -300, y: 100, r: -60 },
  { x: 250, y: 150, r: 45 }, { x: -100, y: 300, r: -20 }, { x: 300, y: -100, r: 60 },
  { x: -250, y: -150, r: -30 }, { x: 100, y: 350, r: 15 }, { x: -50, y: -350, r: -80 }
];

const END_POS = [
  { x: -400, y: -600, r: -90 }, { x: 500, y: -400, r: 120 }, { x: -600, y: 300, r: -150 },
  { x: 400, y: 500, r: 90 }, { x: -300, y: 600, r: -45 }, { x: 600, y: -200, r: 180 },
  { x: -500, y: -300, r: -120 }, { x: 300, y: 700, r: 45 }, { x: -100, y: -700, r: -180 }
];

export default function LoadingScreen({ onComplete, durationMs }: { onComplete?: () => void, durationMs?: number }) {
  const [progress, setProgress] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Text cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((p) => (p + 1) % PHRASES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Progress simulation
  useEffect(() => {
    let current = 0;
    const intervalMs = 100;
    
    // If durationMs is provided, calculate exact increment per tick to finish in durationMs.
    // Otherwise, simulate a random bumpy progress that finishes in ~4-5 seconds.
    const increment = durationMs ? (100 / (durationMs / intervalMs)) : 0;

    const interval = setInterval(() => {
      if (durationMs) {
        current += increment;
      } else {
        current += Math.random() * 6; // random slow progress
      }

      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => setIsExiting(true), durationMs ? 200 : 600);
      }
      setProgress(Math.min(current, 100));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [durationMs]);

  // "Descubra!" text characters
  const word = "Descubra".split('');

  // Variants for the exit animation (scatter outwards)
  const containerExit: Variants = {
    exit: { opacity: 0, transition: { duration: 1, ease: 'easeInOut' } }
  };

  const letterVariants: Variants = {
    hidden: (i: number) => ({
      opacity: 0,
      x: START_POS[i % START_POS.length].x,
      y: START_POS[i % START_POS.length].y,
      rotate: START_POS[i % START_POS.length].r,
    }),
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      transition: { type: 'spring', damping: 12, stiffness: 100, mass: 0.5 }
    },
    exit: (i: number) => ({
      opacity: 0,
      x: END_POS[i % END_POS.length].x,
      y: END_POS[i % END_POS.length].y,
      rotate: END_POS[i % END_POS.length].r,
      transition: { duration: 1, ease: 'easeOut' }
    })
  };

  // Noise texture overlay
  const noiseBg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

  return (
    <AnimatePresence onExitComplete={() => onComplete?.()}>
      {!isExiting && (
        <motion.div
          key="loading-screen"
          variants={containerExit}
          initial="visible"
          animate="visible"
          exit="exit"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#FAFAFA',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Subtle Paper Texture Overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: noiseBg, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Logo Assembly */}
            <div style={{ display: 'flex', alignItems: 'baseline', fontSize: '5rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.05em' }}>
              {word.map((char, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  variants={letterVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    color: COLORS[i % COLORS.length],
                    display: 'inline-block',
                    textShadow: '2px 4px 12px rgba(0,0,0,0.08)',
                    clipPath: 'polygon(5% 0%, 100% 5%, 95% 100%, 0% 95%)' // subtle irregular paper cut shape
                  }}
                >
                  {char}
                </motion.span>
              ))}
              <motion.span
                variants={letterVariants}
                custom={word.length}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  color: '#F97316',
                  display: 'inline-block',
                  marginLeft: '4px',
                  textShadow: '2px 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                <motion.span
                  animate={{ y: [0, -20, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  style={{ display: 'inline-block' }}
                >
                  !
                </motion.span>
              </motion.span>
            </div>

            {/* Curved Progress Bar (The Journey) */}
            <div style={{ marginTop: '3rem', width: '300px', height: '40px', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 300 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background Track */}
                <path d="M 10 20 Q 80 -10, 150 20 T 290 20" stroke="rgba(10, 37, 64, 0.1)" strokeWidth="6" strokeLinecap="round" fill="none" />
                {/* Colored Progress Track */}
                <motion.path
                  d="M 10 20 Q 80 -10, 150 20 T 290 20"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: progress / 100 }}
                  transition={{ ease: "easeOut", duration: 0.3 }}
                />
              </svg>
            </div>

            {/* Dynamic Tooltips */}
            <div style={{ marginTop: '2rem', height: '30px', position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={phraseIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    position: 'absolute',
                    margin: 0,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '1rem',
                    color: '#0A2540',
                    fontWeight: 500,
                    textAlign: 'center',
                    maxWidth: '80%',
                  }}
                >
                  {PHRASES[phraseIdx]}
                </motion.p>
              </AnimatePresence>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
