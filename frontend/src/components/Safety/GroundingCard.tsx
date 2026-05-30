import React from 'react';
import { GroundingTechnique } from '../../services/safetyApi';

interface GroundingCardProps {
  technique: GroundingTechnique;
  onStart: (id: string) => void;
}

const TYPE_BADGE: Record<string, string> = {
  sensory: 'bg-purple-100 text-purple-800',
  breathing: 'bg-cyan-100 text-cyan-800',
  movement: 'bg-orange-100 text-orange-800',
  cognitive: 'bg-blue-100 text-blue-800',
  visualization: 'bg-pink-100 text-pink-800',
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function GroundingCard({ technique, onStart }: GroundingCardProps) {
  const badgeStyle = TYPE_BADGE[technique.type] ?? 'bg-gray-100 text-gray-700';
  const effectivenessPercent = Math.max(0, Math.min(100, Math.round(technique.effectiveness * 100)));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-gray-900 leading-tight">{technique.name}</p>
        <span
          className={`shrink-0 inline-block px-2 py-0.5 text-xs font-medium rounded-full ${badgeStyle}`}
        >
          {capitalize(technique.type)}
        </span>
      </div>

      {/* Duration */}
      <p className="text-xs text-gray-500">~{technique.duration} min</p>

      {/* Effectiveness bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Effectiveness</span>
          <span>{effectivenessPercent}%</span>
        </div>
        <div
          className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"
          role="meter"
          aria-label={`Effectiveness: ${effectivenessPercent}%`}
          aria-valuenow={effectivenessPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${effectivenessPercent}%` }}
          />
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => onStart(technique.id)}
        className="mt-1 w-full py-2 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
        aria-label={`Start ${technique.name} exercise`}
      >
        Start Exercise
      </button>
    </div>
  );
}
