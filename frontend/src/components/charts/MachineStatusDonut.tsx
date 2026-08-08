import React from "react";
import type { MachineStatusCounts } from "../../types/dashboard";

interface MachineStatusDonutProps {
  statusCounts: MachineStatusCounts | null;
  isLoading?: boolean;
}

const STATUS_CONFIG = [
  { key: "WORKING", label: "Working", color: "#1B7A3E" },
  { key: "AVAILABLE", label: "Available", color: "#3182CE" },
  { key: "REPAIR", label: "Repair", color: "#DD6B20" },
  { key: "OFFLINE", label: "Offline", color: "#718096" },
] as const;

export const MachineStatusDonut: React.FC<MachineStatusDonutProps> = ({
  statusCounts,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="sa-chart-placeholder">
        <div className="sa-spinner sa-spinner-sm" />
        <span>Loading machine status...</span>
      </div>
    );
  }

  if (!statusCounts || statusCounts.total === 0) {
    return (
      <div className="sa-chart-placeholder">
        <span>No machines registered in fleet</span>
      </div>
    );
  }

  const total = statusCounts.total;
  const radius = 60;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const slices = STATUS_CONFIG.map((cfg) => {
    const count = statusCounts[cfg.key] || 0;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const strokeLength = (count / total) * circumference;
    const offset = cumulativeOffset;
    cumulativeOffset += strokeLength;

    return {
      ...cfg,
      count,
      percentage: Math.round(percentage * 10) / 10,
      strokeLength,
      offset,
    };
  });

  return (
    <div className="sa-donut-wrapper">
      <div className="sa-donut-container">
        <svg viewBox="0 0 160 160" className="sa-donut-svg">
          {/* Background circle */}
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#EDF2F7" strokeWidth={strokeWidth} />
          {/* Donut slices */}
          {slices.map(
            (slice) =>
              slice.count > 0 && (
                <circle
                  key={slice.key}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${slice.strokeLength} ${circumference - slice.strokeLength}`}
                  strokeDashoffset={-slice.offset}
                  transform="rotate(-90 80 80)"
                  className="sa-donut-slice"
                />
              )
          )}
        </svg>
        <div className="sa-donut-center">
          <span className="sa-donut-total">{total}</span>
          <span className="sa-donut-label">Fleet Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="sa-donut-legend">
        {slices.map((slice) => (
          <div key={slice.key} className="sa-legend-item">
            <span className="sa-legend-dot" style={{ backgroundColor: slice.color }} />
            <span className="sa-legend-label">{slice.label}</span>
            <span className="sa-legend-val">
              {slice.count} ({slice.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
