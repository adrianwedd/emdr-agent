import React from 'react';

interface SUDSparklineProps {
  values: number[];
  maxValue?: number;
  width?: number;
  height?: number;
}

function getColor(lastValue: number): string {
  if (lastValue >= 7) return '#ef4444'; // red
  if (lastValue >= 4) return '#eab308'; // yellow
  return '#22c55e'; // green
}

export function SUDSparkline({
  values,
  maxValue = 10,
  width = 80,
  height = 24,
}: SUDSparklineProps) {
  // Handle empty or single value — render a flat line at the single value or baseline
  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#d1d5db"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const lastValue = values[values.length - 1];
  const color = getColor(lastValue);

  if (values.length === 1) {
    // Draw a single point as a short horizontal line
    const y = height - (lastValue / maxValue) * height;
    const clampedY = Math.max(1, Math.min(height - 1, y));
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <line
          x1={width * 0.25}
          y1={clampedY}
          x2={width * 0.75}
          y2={clampedY}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Build polyline points
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (Math.min(value, maxValue) / maxValue) * height;
      // Clamp to stay within SVG bounds
      const clampedY = Math.max(1, Math.min(height - 1, y));
      return `${x.toFixed(1)},${clampedY.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
