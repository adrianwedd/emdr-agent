import React from 'react';
import { Brain } from 'lucide-react';

interface TargetMemoryCardProps {
  description: string;
  negativeCognition: string;
  positiveCognition: string;
  emotion: string;
  bodyLocation?: string;
}

export const TargetMemoryCard: React.FC<TargetMemoryCardProps> = ({
  description, negativeCognition, positiveCognition, emotion, bodyLocation,
}) => {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-indigo-700">
        <Brain className="w-5 h-5" />
        <h4 className="font-semibold text-sm uppercase tracking-wide">Target Memory</h4>
      </div>
      <p className="text-gray-800 text-sm">{description}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-red-600 font-medium block text-xs mb-0.5">Negative Cognition</span>
          <span className="text-gray-700 italic">"{negativeCognition}"</span>
        </div>
        <div>
          <span className="text-green-600 font-medium block text-xs mb-0.5">Positive Cognition</span>
          <span className="text-gray-700 italic">"{positiveCognition}"</span>
        </div>
      </div>
      <div className="flex gap-4 text-sm text-gray-600">
        <span>Emotion: <strong>{emotion}</strong></span>
        {bodyLocation && <span>Body: <strong>{bodyLocation}</strong></span>}
      </div>
    </div>
  );
};
