import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSafetyStore } from '../../stores/safetyStore';
import { SafetyAssessmentCard } from './SafetyAssessmentCard';
import { SafetyHistoryTimeline } from './SafetyHistoryTimeline';
import { GroundingCard } from './GroundingCard';
import { CrisisResourcesCard } from './CrisisResourcesCard';

interface SafetyPanelProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartGrounding: (techniqueId: string) => void;
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function SafetyPanel({
  sessionId,
  isOpen,
  onClose,
  onStartGrounding,
}: SafetyPanelProps) {
  const assessment = useSafetyStore((s) => s.assessment);
  const isAssessing = useSafetyStore((s) => s.isAssessing);
  const history = useSafetyStore((s) => s.history);
  const groundingTechniques = useSafetyStore((s) => s.groundingTechniques);
  const crisisResources = useSafetyStore((s) => s.crisisResources);
  const fetchHistory = useSafetyStore((s) => s.fetchHistory);
  const fetchGroundingTechniques = useSafetyStore((s) => s.fetchGroundingTechniques);

  // Track whether the panel has been opened at least once
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      fetchHistory(sessionId);
      fetchGroundingTechniques();
    }
  }, [isOpen, sessionId, fetchHistory, fetchGroundingTechniques]);

  return (
    <motion.div
      role="complementary"
      aria-label="Safety monitoring panel"
      className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-40 overflow-y-auto flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'tween', duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <h2 className="text-base font-semibold text-gray-800">Safety Monitor</h2>
        <button
          onClick={onClose}
          aria-label="Close safety panel"
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">

        {/* Section 1: Current Assessment */}
        <details open className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 outline-none">
            <span className="text-sm font-semibold text-gray-700">Current Assessment</span>
            <svg
              className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <SafetyAssessmentCard assessment={assessment} isAssessing={isAssessing} />
        </details>

        {/* Section 2: Safety History */}
        <details open className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 outline-none">
            <span className="text-sm font-semibold text-gray-700">Safety History</span>
            <svg
              className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <SafetyHistoryTimeline history={history} />
        </details>

        {/* Section 3: Grounding Techniques */}
        <details open className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 outline-none">
            <span className="text-sm font-semibold text-gray-700">Grounding Techniques</span>
            <svg
              className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </summary>
          <div className="p-4 space-y-3">
            {groundingTechniques.length === 0 ? (
              <p className="text-sm text-gray-400 text-center">
                No grounding techniques available.
              </p>
            ) : (
              groundingTechniques.map((technique) => (
                <GroundingCard
                  key={technique.id}
                  technique={technique}
                  onStart={onStartGrounding}
                />
              ))
            )}
          </div>
        </details>

        {/* Crisis Resources — always visible at bottom */}
        <div className="p-4">
          <CrisisResourcesCard resources={crisisResources} />
        </div>
      </div>
    </motion.div>
  );
}
