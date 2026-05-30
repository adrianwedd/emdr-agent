import React, { useEffect, useRef } from 'react';
import { Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSafetyStore } from '../../stores/safetyStore';
import { SUDSparkline } from './SUDSparkline';
import type { RiskLevel } from '../../services/safetyApi';

// Granular selectors — one per field
const selectAssessment = (s: ReturnType<typeof useSafetyStore.getState>) => s.assessment;
const selectHistory = (s: ReturnType<typeof useSafetyStore.getState>) => s.history;
const selectIsAssessing = (s: ReturnType<typeof useSafetyStore.getState>) => s.isAssessing;
const selectFetchAssessment = (s: ReturnType<typeof useSafetyStore.getState>) => s.fetchAssessment;
const selectPerformCheck = (s: ReturnType<typeof useSafetyStore.getState>) => s.performCheck;

interface SafetyStatusBarProps {
  sessionId: string;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800 animate-pulse',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Low Risk',
  MEDIUM: 'Medium Risk',
  HIGH: 'High Risk',
  CRITICAL: 'Critical',
};

export function SafetyStatusBar({ sessionId, onTogglePanel, isPanelOpen }: SafetyStatusBarProps) {
  const assessment = useSafetyStore(selectAssessment);
  const history = useSafetyStore(selectHistory);
  const isAssessing = useSafetyStore(selectIsAssessing);
  const fetchAssessment = useSafetyStore(selectFetchAssessment);
  const performCheck = useSafetyStore(selectPerformCheck);

  // Track previous SUD for trend arrow
  const prevSudRef = useRef<number | null>(null);

  const currentSud = assessment?.sudLevel ?? null;
  const riskLevel: RiskLevel = assessment?.riskLevel ?? 'LOW';

  // Determine trend based on previous vs current SUD
  let TrendIcon = Minus;
  let trendColor = 'text-gray-400';
  let trendLabel = 'stable';

  if (prevSudRef.current !== null && currentSud !== null) {
    if (currentSud > prevSudRef.current) {
      TrendIcon = TrendingUp;
      trendColor = 'text-red-500';
      trendLabel = 'increasing';
    } else if (currentSud < prevSudRef.current) {
      TrendIcon = TrendingDown;
      trendColor = 'text-green-500';
      trendLabel = 'decreasing';
    }
  }

  // Update previous SUD ref after render decisions are made
  useEffect(() => {
    if (currentSud !== null) {
      prevSudRef.current = currentSud;
    }
  }, [currentSud]);

  // Fetch assessment on mount
  useEffect(() => {
    fetchAssessment(sessionId);
  }, [fetchAssessment, sessionId]);

  // Extract last 8 SUD values from history for sparkline
  const sparklineValues: number[] = history
    .slice(-8)
    .map((check) => {
      // SafetyCheck has details which may include sudLevel
      const details = check.details as Record<string, unknown> | undefined;
      const val = details?.sudLevel;
      return typeof val === 'number' ? val : null;
    })
    .filter((v): v is number => v !== null);

  // Append current assessment SUD if available
  if (currentSud !== null) {
    sparklineValues.push(currentSud);
  }

  const badgeClasses = RISK_BADGE_CLASSES[riskLevel];
  const badgeLabel = RISK_LABELS[riskLevel];

  return (
    <div
      className="flex items-center gap-3 bg-white border-b border-therapy-border px-4 py-2"
      role="status"
      aria-label="Safety monitoring status bar"
    >
      {/* Risk badge */}
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClasses}`}
        aria-label={`Risk level: ${badgeLabel}`}
      >
        {badgeLabel}
      </span>

      {/* SUD display with trend arrow */}
      <div
        className="flex items-center gap-1 text-sm font-medium text-gray-700"
        aria-label={`SUD level ${currentSud ?? '—'}, trend ${trendLabel}`}
      >
        <span>SUD: {currentSud !== null ? currentSud : '—'}</span>
        <TrendIcon
          className={`h-3.5 w-3.5 ${trendColor}`}
          aria-hidden="true"
        />
      </div>

      {/* SUD sparkline */}
      <SUDSparkline values={sparklineValues} />

      {/* Spacer to push buttons to the right */}
      <div className="flex-1" />

      {/* Safety Check button */}
      <button
        onClick={() => performCheck(sessionId)}
        disabled={isAssessing}
        className="px-3 py-1 text-xs font-medium rounded border border-therapy-border text-therapy-muted bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-therapy-accent focus:ring-offset-1"
        aria-label="Perform a manual safety check"
      >
        {isAssessing ? 'Checking...' : 'Safety Check'}
      </button>

      {/* Panel toggle */}
      <button
        onClick={onTogglePanel}
        className={`p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-therapy-accent focus:ring-offset-1 ${
          isPanelOpen ? 'bg-therapy-accent/10 text-therapy-accent' : 'text-therapy-muted hover:bg-gray-100'
        }`}
        aria-label={isPanelOpen ? 'Close safety panel' : 'Open safety panel'}
        aria-pressed={isPanelOpen}
      >
        <Shield className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
