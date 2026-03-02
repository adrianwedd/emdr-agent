import React from 'react';
import { Clock } from 'lucide-react';

interface SessionTimerProps {
  elapsed: number;
  phaseElapsed: number;
  currentPhase?: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  elapsed, phaseElapsed, currentPhase,
}) => {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2 text-gray-700">
        <Clock className="w-4 h-4 text-therapy-muted" />
        <span className="font-mono text-lg font-semibold">{formatTime(elapsed)}</span>
        <span className="text-therapy-muted">total</span>
      </div>
      {currentPhase && (
        <div className="flex items-center gap-2 text-gray-500">
          <span className="font-mono text-base">{formatTime(phaseElapsed)}</span>
          <span className="text-therapy-muted">in phase</span>
        </div>
      )}
    </div>
  );
};
