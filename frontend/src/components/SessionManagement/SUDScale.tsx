import React from 'react';
import { motion } from 'framer-motion';

const SUD_LABELS: Record<number, string> = {
  0: 'No distress', 1: 'Minimal', 2: 'Mild', 3: 'Low', 4: 'Moderate',
  5: 'Medium', 6: 'Uncomfortable', 7: 'High', 8: 'Severe', 9: 'Extreme', 10: 'Worst possible',
};

const SUD_COLORS: Record<number, string> = {
  0: 'bg-sud-0', 1: 'bg-sud-1', 2: 'bg-sud-2', 3: 'bg-sud-3',
  4: 'bg-sud-4', 5: 'bg-sud-5', 6: 'bg-sud-6', 7: 'bg-sud-7',
  8: 'bg-sud-8', 9: 'bg-sud-9', 10: 'bg-sud-10',
};

interface SUDScaleProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

export const SUDScale: React.FC<SUDScaleProps> = ({
  value, onChange, disabled = false, label = 'Subjective Units of Distress (SUD)',
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {value !== undefined && (
          <span className="text-sm text-gray-500">{value} — {SUD_LABELS[value]}</span>
        )}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 11 }, (_, i) => (
          <motion.button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i)}
            className={`flex-1 h-12 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-therapy-accent ${
              value === i
                ? `${SUD_COLORS[i]} text-white shadow-md scale-110`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            whileTap={disabled ? {} : { scale: 0.95 }}
            aria-label={`SUD level ${i}: ${SUD_LABELS[i]}`}
            aria-pressed={value === i}
          >
            {i}
          </motion.button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-therapy-muted">
        <span>No distress</span>
        <span>Worst possible</span>
      </div>
    </div>
  );
};
