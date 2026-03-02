import React, { useId } from 'react';
import { motion } from 'framer-motion';

const VOC_LABELS: Record<number, string> = {
  1: 'Completely false', 2: 'Mostly false', 3: 'Somewhat false',
  4: 'Neutral', 5: 'Somewhat true', 6: 'Mostly true', 7: 'Completely true',
};

const VOC_COLORS: Record<number, string> = {
  1: 'bg-voc-1', 2: 'bg-voc-2', 3: 'bg-voc-3', 4: 'bg-voc-4',
  5: 'bg-voc-5', 6: 'bg-voc-6', 7: 'bg-voc-7',
};

interface VOCScaleProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  cognition?: string;
}

export const VOCScale: React.FC<VOCScaleProps> = ({
  value, onChange, disabled = false, label = 'Validity of Cognition (VOC)', cognition,
}) => {
  const labelId = useId();
  return (
    <div className="space-y-3">
      <div>
        <label id={labelId} className="text-sm font-medium text-gray-700">{label}</label>
        {cognition && <p className="text-sm text-therapy-muted italic mt-1">"{cognition}"</p>}
      </div>
      {value !== undefined && (
        <p className="text-sm text-gray-500">{value} — {VOC_LABELS[value]}</p>
      )}
      <div className="flex gap-2" role="radiogroup" aria-labelledby={labelId}>
        {Array.from({ length: 7 }, (_, i) => {
          const level = i + 1;
          return (
            <motion.button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onChange(level)}
              className={`flex-1 h-14 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-therapy-accent ${
                value === level
                  ? `${VOC_COLORS[level]} text-white shadow-md scale-110`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              whileTap={disabled ? {} : { scale: 0.95 }}
              aria-label={`VOC level ${level}: ${VOC_LABELS[level]}`}
              aria-pressed={value === level}
            >
              {level}
            </motion.button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-therapy-muted">
        <span>Completely false</span>
        <span>Completely true</span>
      </div>
    </div>
  );
};
