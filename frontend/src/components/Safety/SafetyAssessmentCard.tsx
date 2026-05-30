import React from 'react';
import { SafetyAssessment } from '../../services/safetyApi';

interface SafetyAssessmentCardProps {
  assessment: SafetyAssessment | null;
  isAssessing: boolean;
}

const RISK_LEVEL_STYLES: Record<string, { badge: string; label: string }> = {
  LOW: { badge: 'bg-green-100 text-green-800 border-green-200', label: 'Low Risk' },
  MEDIUM: { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium Risk' },
  HIGH: { badge: 'bg-orange-100 text-orange-800 border-orange-200', label: 'High Risk' },
  CRITICAL: { badge: 'bg-red-100 text-red-800 border-red-200', label: 'Critical' },
};

const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-green-400',
  medium: 'bg-yellow-400',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const ACTION_BOX: Record<string, string> = {
  LOW: 'bg-blue-50 border-blue-200 text-blue-800',
  MEDIUM: 'bg-orange-50 border-orange-200 text-orange-800',
  HIGH: 'bg-orange-50 border-orange-200 text-orange-800',
  CRITICAL: 'bg-red-50 border-red-200 text-red-900',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Loading assessment" aria-busy="true">
      <div className="flex items-center gap-3">
        <div className="h-6 w-24 bg-gray-200 rounded-full" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-200 shrink-0" />
            <div className="h-4 bg-gray-200 rounded flex-1" />
          </div>
        ))}
      </div>
      <div className="h-12 bg-gray-200 rounded-lg" />
    </div>
  );
}

export function SafetyAssessmentCard({ assessment, isAssessing }: SafetyAssessmentCardProps) {
  if (isAssessing) {
    return (
      <div className="p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-4 text-center text-sm text-gray-500" role="status">
        No assessment yet. A safety check will run automatically during your session.
      </div>
    );
  }

  const riskStyle = RISK_LEVEL_STYLES[assessment.riskLevel] ?? RISK_LEVEL_STYLES.LOW;
  const actionBoxStyle = ACTION_BOX[assessment.riskLevel] ?? ACTION_BOX.LOW;

  return (
    <div className="p-4 space-y-4">
      {/* Risk level badge */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${riskStyle.badge}`}
          role="status"
          aria-label={`Risk level: ${riskStyle.label}`}
        >
          {riskStyle.label}
        </span>
        <span className="text-xs text-gray-500">
          SUD: {assessment.sudLevel}/10
        </span>
      </div>

      {/* Indicators */}
      {assessment.indicators.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Indicators
          </p>
          <ul className="space-y-1.5" aria-label="Safety indicators">
            {assessment.indicators.map((indicator, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${SEVERITY_DOT[indicator.severity] ?? 'bg-gray-400'}`}
                  aria-label={`${indicator.severity} severity`}
                />
                <span className="text-sm text-gray-700">{indicator.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended action */}
      <div
        className={`border rounded-lg p-3 text-sm ${actionBoxStyle}`}
        role="note"
        aria-label="Recommended action"
      >
        <p className="font-medium mb-0.5">Recommended Action</p>
        <p>{assessment.recommendedAction}</p>
      </div>

      {/* Intervention instructions */}
      {assessment.intervention && assessment.intervention.instructions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
            Next Steps
          </p>
          <ol className="space-y-1 list-decimal list-inside" aria-label="Intervention instructions">
            {assessment.intervention.instructions.map((instruction, idx) => (
              <li key={idx} className="text-sm text-gray-700 leading-snug">
                {instruction}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
