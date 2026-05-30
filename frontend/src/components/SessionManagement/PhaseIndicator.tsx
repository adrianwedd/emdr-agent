import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PHASES = [
  { key: 'preparation', label: 'Preparation', short: '1' },
  { key: 'assessment', label: 'Assessment', short: '2' },
  { key: 'desensitization', label: 'Desensitization', short: '3' },
  { key: 'installation', label: 'Installation', short: '4' },
  { key: 'body_scan', label: 'Body Scan', short: '5' },
  { key: 'closure', label: 'Closure', short: '6' },
  { key: 'reevaluation', label: 'Reevaluation', short: '7' },
  { key: 'resource_installation', label: 'Resources', short: '8' },
] as const;

export const PHASE_ORDER = PHASES.map(p => p.key);

interface PhaseIndicatorProps {
  currentPhase: string;
  completedPhases?: string[];
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  currentPhase,
  completedPhases = [],
}) => {
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase.toLowerCase());

  return (
    <div className="w-full px-2">
      <div className="flex items-center justify-between" role="list" aria-label="EMDR therapy phases">
        {PHASES.map((phase, index) => {
          const isCompleted = completedPhases.includes(phase.key) || index < currentIndex;
          const isCurrent = phase.key === currentPhase.toLowerCase();

          return (
            <React.Fragment key={phase.key}>
              <div className="flex flex-col items-center relative" role="listitem">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                    isCurrent
                      ? 'border-therapy-accent bg-therapy-accent text-white'
                      : isCompleted
                      ? 'border-therapy-safe bg-therapy-safe text-white'
                      : 'border-therapy-border bg-therapy-surface text-therapy-muted'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : phase.short}
                </motion.div>
                <span
                  className={`mt-2 text-xs text-center max-w-[80px] leading-tight ${
                    isCurrent ? 'text-therapy-accent font-semibold' : isCompleted ? 'text-therapy-safe' : 'text-therapy-muted'
                  }`}
                >
                  {phase.label}
                </span>
              </div>
              {index < PHASES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mt-[-20px]">
                  <div
                    className={`h-full rounded ${
                      index < currentIndex ? 'bg-therapy-safe' : 'bg-therapy-border'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
