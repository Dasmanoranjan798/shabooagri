import React, { useState } from "react";
import type { IncomeSeriesPoint } from "../../types/dashboard";
import { formatCurrency } from "../../lib/theme";

interface IncomeOverviewChartProps {
  data: IncomeSeriesPoint[];
  granularity: "day" | "month";
  isLoading?: boolean;
}

export const IncomeOverviewChart: React.FC<IncomeOverviewChartProps> = ({
  data,
  granularity: _granularity,
  isLoading = false,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; amount: number; x: number; y: number } | null>(null);

  if (isLoading) {
    return (
      <div className="sa-chart-placeholder">
        <div className="sa-spinner sa-spinner-sm" />
        <span>Loading chart data...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="sa-chart-placeholder">
        <span>No income recorded for this period</span>
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 65 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const amounts = data.map((d) => d.amount);
  const maxAmount = Math.max(...amounts, 1000);
  const minAmount = 0;

  const points = data.map((d, index) => {
    const label = "date" in d ? d.date : d.month;
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.amount - minAmount) / (maxAmount - minAmount)) * chartHeight;
    return { label, amount: d.amount, x, y };
  });

  const pathD = points.reduce((acc, point, index) => {
    return index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, "");

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : "";

  const yTicks = [0, Math.round(maxAmount * 0.5), maxAmount];

  const step = Math.ceil(points.length / 7);
  const visiblePoints = points.filter((_, i) => i % step === 0 || i === points.length - 1);

  return (
    <div className="sa-chart-container" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="sa-chart-svg">
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B7A3E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1B7A3E" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y Grid Lines & Labels */}
        {yTicks.map((val, idx) => {
          const y = padding.top + chartHeight - (val / maxAmount) * chartHeight;
          return (
            <g key={idx}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="sa-chart-axis-text">
                {formatCurrency(val)}
              </text>
            </g>
          );
        })}

        {/* Area Gradient */}
        {areaD && <path d={areaD} fill="url(#incomeGradient)" />}

        {/* Line Path */}
        {pathD && <path d={pathD} fill="none" stroke="#1B7A3E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Data Points */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r="4"
            className="sa-chart-dot"
            onMouseEnter={() => setHoveredPoint(p)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}

        {/* X Axis Labels */}
        {visiblePoints.map((p, idx) => (
          <text key={idx} x={p.x} y={height - 12} textAnchor="middle" className="sa-chart-axis-text">
            {p.label.slice(5)}
          </text>
        ))}
      </svg>

      {/* Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="sa-chart-tooltip"
          style={{
            position: "absolute",
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: "translate(-50%, -120%)",
          }}
        >
          <div className="sa-tooltip-date">{hoveredPoint.label}</div>
          <div className="sa-tooltip-value">{formatCurrency(hoveredPoint.amount)}</div>
        </div>
      )}
    </div>
  );
};
