import React, { useState, useEffect, useRef } from 'react';
import { GroundingTechnique } from '../../services/safetyApi';
import { CrisisResourcesCard } from './CrisisResourcesCard';
import { BoxBreathingGuide } from './BoxBreathingGuide';

interface GroundingExerciseProps {
  technique: GroundingTechnique | null;
  onComplete: (effectiveness: number) => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function GroundingExercise({ technique, onComplete, onCancel }: GroundingExerciseProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showCrisis, setShowCrisis] = useState(false);
  const completedRef = useRef(false);

  // Reset step and timer when technique changes
  useEffect(() => {
    setCurrentStep(0);
    setElapsed(0);
    setShowCrisis(false);
    completedRef.current = false;
  }, [technique]);

  // Elapsed timer
  useEffect(() => {
    if (!technique) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [technique]);

  // Don't render overlay when no technique is selected
  if (!technique) return null;

  const isBreathing = technique.type === 'breathing';
  const instructions = technique.instructions ?? [];
  const isLastStep = currentStep === instructions.length - 1;

  function handleNext() {
    if (isLastStep) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete(7);
      }
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handlePrevious() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  function handleIFeelBetter() {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete(7);
    }
  }

  function handleNeedMoreHelp() {
    setShowCrisis(true);
  }

  function handleCloseCrisis() {
    setShowCrisis(false);
    // Do not call onComplete — user may want to continue the exercise
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-therapy-bg flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Grounding exercise: ${technique.name}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-therapy-border bg-therapy-surface shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">{technique.name}</h2>
          <span className="text-xs text-therapy-muted uppercase tracking-wide bg-therapy-calm rounded-full px-2 py-0.5">
            {technique.type}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Elapsed time */}
          <span
            className="text-sm font-mono text-therapy-muted tabular-nums"
            aria-label={`Elapsed time: ${formatTime(elapsed)}`}
          >
            {formatTime(elapsed)}
          </span>

          {/* Close button */}
          <button
            onClick={onCancel}
            aria-label="Close grounding exercise"
            className="w-8 h-8 flex items-center justify-center rounded-full text-therapy-muted hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-therapy-focus"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        {isBreathing ? (
          /* Breathing technique — delegate to BoxBreathingGuide */
          <div className="w-full max-w-md">
            <BoxBreathingGuide onComplete={() => onComplete(7)} />
          </div>
        ) : (
          /* Step-by-step instructions */
          <div className="w-full max-w-lg flex flex-col items-center gap-8">
            {/* Current instruction */}
            <div
              className="text-center"
              aria-live="polite"
              aria-atomic="true"
            >
              {instructions.length > 0 ? (
                <p className="text-2xl font-medium text-gray-800 leading-relaxed">
                  {instructions[currentStep]}
                </p>
              ) : (
                <p className="text-lg text-therapy-muted">No instructions available.</p>
              )}
            </div>

            {/* Step progress dots */}
            {instructions.length > 1 && (
              <div className="flex items-center gap-2" role="group" aria-label="Step progress">
                {instructions.map((_, idx) => (
                  <div
                    key={idx}
                    aria-hidden="true"
                    className={`rounded-full transition-all duration-200 ${
                      idx === currentStep
                        ? 'w-3 h-3 bg-therapy-focus'
                        : idx < currentStep
                        ? 'w-2 h-2 bg-therapy-focus opacity-50'
                        : 'w-2 h-2 bg-therapy-border'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Navigation buttons */}
            {instructions.length > 0 && (
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="px-5 py-2 rounded-lg border border-therapy-border text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-therapy-focus"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 rounded-lg bg-therapy-focus text-white text-sm font-medium hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-therapy-focus focus:ring-offset-2"
                >
                  {isLastStep ? 'Done' : 'Next'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — exit options */}
      <div className="px-6 py-4 border-t border-therapy-border bg-therapy-surface flex items-center justify-center gap-4 flex-wrap">
        <button
          onClick={handleIFeelBetter}
          className="px-6 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          I feel better
        </button>
        <button
          onClick={handleNeedMoreHelp}
          className="px-6 py-2.5 rounded-lg bg-amber-400 text-amber-900 text-sm font-semibold hover:bg-amber-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
        >
          I need more help
        </button>
      </div>

      {/* Crisis resources overlay */}
      {showCrisis && (
        <div
          className="absolute inset-0 z-10 bg-black/50 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Crisis resources"
        >
          <div className="w-full max-w-md bg-therapy-surface rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            <CrisisResourcesCard compact />
            <button
              onClick={handleCloseCrisis}
              className="self-center px-5 py-2 rounded-lg border border-therapy-border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-therapy-focus"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
