import React, { useState } from 'react';
import { SafetyCheck } from '../../services/safetyApi';

interface SafetyHistoryTimelineProps {
  history: SafetyCheck[];
}

const CHECK_TYPE_BADGE: Record<string, string> = {
  AUTOMATIC: 'bg-blue-100 text-blue-800',
  MANUAL: 'bg-green-100 text-green-800',
  TRIGGERED: 'bg-amber-100 text-amber-800',
};

const RISK_LEVEL_TEXT: Record<string, string> = {
  LOW: 'text-green-700',
  MEDIUM: 'text-yellow-700',
  HIGH: 'text-orange-700',
  CRITICAL: 'text-red-700',
};

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const MAX_VISIBLE = 10;

export function SafetyHistoryTimeline({ history }: SafetyHistoryTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-400" role="status">
        No safety checks recorded yet.
      </div>
    );
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const visible = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  return (
    <div className="p-4">
      <ol className="relative" aria-label="Safety check history">
        {visible.map((check, idx) => {
          const isLast = idx === visible.length - 1;
          const badgeStyle = CHECK_TYPE_BADGE[check.type] ?? 'bg-gray-100 text-gray-700';
          const riskStyle = RISK_LEVEL_TEXT[check.riskLevel.toUpperCase()] ?? 'text-gray-600';

          return (
            <li key={check.id} className="flex gap-3">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div
                  className="h-3 w-3 rounded-full bg-gray-400 border-2 border-white ring-1 ring-gray-300 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                {!isLast && (
                  <div className="flex-1 w-px bg-gray-200 my-1" aria-hidden="true" />
                )}
              </div>

              {/* Entry content */}
              <div className={`pb-4 flex-1 min-w-0 ${isLast ? '' : ''}`}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${badgeStyle}`}
                  >
                    {check.type}
                  </span>
                  <span className={`text-xs font-semibold ${riskStyle}`}>
                    {check.riskLevel}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {relativeTime(check.createdAt)}
                  </span>
                </div>
                {check.action && (
                  <p className="text-sm text-gray-600 leading-snug">{check.action}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-1 text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
          aria-expanded={showAll}
        >
          {showAll ? 'Show less' : `Show ${sorted.length - MAX_VISIBLE} more`}
        </button>
      )}
    </div>
  );
}
