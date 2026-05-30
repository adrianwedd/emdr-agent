import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface BoxBreathingGuideProps {
  onComplete: () => void;
}

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

const PHASE_DURATION = 4; // seconds per phase
const TOTAL_CYCLES = 4;
const PHASES: Phase[] = ['inhale', 'hold1', 'exhale', 'hold2'];

const PHASE_LABELS: Record<Phase, string> = {
  inhale: 'Inhale...',
  hold1: 'Hold...',
  exhale: 'Exhale...',
  hold2: 'Hold...',
};

const PHASE_COLORS: Record<Phase, { text: string; stroke: string; bg: string }> = {
  inhale: { text: 'text-blue-600', stroke: '#3b82f6', bg: 'bg-blue-100' },
  hold1: { text: 'text-purple-600', stroke: '#9333ea', bg: 'bg-purple-100' },
  exhale: { text: 'text-teal-600', stroke: '#0d9488', bg: 'bg-teal-100' },
  hold2: { text: 'text-purple-600', stroke: '#9333ea', bg: 'bg-purple-100' },
};

// Circle size scale: inhale grows, exhale shrinks, hold stays
const CIRCLE_SCALE: Record<Phase, number> = {
  inhale: 1.4,
  hold1: 1.4,
  exhale: 0.6,
  hold2: 0.6,
};

// SVG constants for the progress ring
const SVG_SIZE = 200;
const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BoxBreathingGuide({ onComplete }: BoxBreathingGuideProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Keep a stable ref to onComplete so the interval effect never needs to re-run
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // tick: total seconds elapsed within a single phase (0 to PHASE_DURATION-1)
  // phaseIndex: index into PHASES array (0-3)
  // cycleCount: completed cycles (0-based, increments when phaseIndex wraps)
  const [tick, setTick] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const completedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const currentPhase = PHASES[phaseIndex];
  const colors = PHASE_COLORS[currentPhase];
  const secondsRemaining = PHASE_DURATION - tick;

  // Fraction of the current phase completed (0→1)
  const phaseProgress = tick / PHASE_DURATION;

  // stroke-dashoffset: full circumference means no ring, 0 means full ring
  const strokeDashoffset = CIRCUMFERENCE * (1 - phaseProgress);

  useEffect(() => {
    if (completedRef.current) return;

    const interval = setInterval(() => {
      setTick((prevTick) => {
        const nextTick = prevTick + 1;

        if (nextTick >= PHASE_DURATION) {
          // Advance to next phase
          setPhaseIndex((prevPhase) => {
            const nextPhase = (prevPhase + 1) % PHASES.length;

            if (nextPhase === 0) {
              // Completed a full cycle
              setCycleCount((prevCycles) => {
                const newCycles = prevCycles + 1;
                if (newCycles >= TOTAL_CYCLES && !completedRef.current) {
                  completedRef.current = true;
                  clearInterval(interval);
                  // Defer onComplete so state updates settle first
                  timeoutRef.current = setTimeout(() => onCompleteRef.current(), 500);
                }
                return newCycles;
              });
            }

            return nextPhase;
          });

          return 0; // reset tick for new phase
        }

        return nextTick;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // stable — no deps needed

  const displayCycle = Math.min(cycleCount + 1, TOTAL_CYCLES);

  if (prefersReducedMotion) {
    // Accessible text-only fallback
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-6">
        <div
          className={`text-5xl font-bold ${colors.text}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {PHASE_LABELS[currentPhase]}
        </div>
        <div className="text-3xl text-therapy-muted tabular-nums">
          {secondsRemaining}s
        </div>
        <div className="text-sm text-therapy-muted">
          Cycle {displayCycle} of {TOTAL_CYCLES}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-6">
      {/* Animated breathing circle with SVG progress ring */}
      <div className="relative flex items-center justify-center" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
        {/* SVG progress ring */}
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          className="absolute inset-0"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={8}
          />
          {/* Animated progress arc */}
          <circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${SVG_SIZE / 2} ${SVG_SIZE / 2})`}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
          />
        </svg>

        {/* Growing / shrinking inner circle */}
        <motion.div
          className={`rounded-full ${colors.bg}`}
          animate={{ scale: CIRCLE_SCALE[currentPhase] }}
          transition={{
            duration: PHASE_DURATION,
            ease: currentPhase === 'inhale' ? 'easeIn' : currentPhase === 'exhale' ? 'easeOut' : 'linear',
          }}
          style={{ width: 80, height: 80 }}
          aria-hidden="true"
        />

        {/* Phase label and seconds in center */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={`text-sm font-semibold ${colors.text}`}>
            {PHASE_LABELS[currentPhase]}
          </span>
          <span className="text-xs text-therapy-muted tabular-nums mt-0.5">
            {secondsRemaining}s
          </span>
        </div>
      </div>

      {/* Cycle counter */}
      <div className="text-sm text-therapy-muted">
        Cycle {displayCycle} of {TOTAL_CYCLES}
      </div>
    </div>
  );
}
