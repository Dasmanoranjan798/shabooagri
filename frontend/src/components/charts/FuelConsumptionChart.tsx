import React, { useState } from "react";
import type { FuelSeriesPoint } from "../../types/dashboard";

interface FuelConsumptionChartProps {
  data: FuelSeriesPoint[];
  isLoading?: boolean;
}

export const FuelConsumptionChart: React.FC<FuelConsumptionChartProps> = ({
  data,
  isLoading = false,
}) => {
  const [hoveredBar, setHoveredBar] = useState<{ date: string; litres: number; x: number; y: number } | null>(null);

  if (isLoading) {
    return (
      <div className="sa-chart-placeholder">
        <div className="sa-spinner sa-spinner-sm" />
        <span>Loading fuel consumption data...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="sa-chart-placeholder">
        <span>No fuel entries recorded for this period</span>
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const litresList = data.map((d) => d.litres);
  const maxLitres = Math.max(...litresList, 20);

  const barWidth = Math.max(4, Math.min(24, chartWidth / data.length - 4));
  const step = chartWidth / data.length;

  const yTicks = [0, Math.round(maxLitres * 0.5), Math.round(maxLitres)];

  const labelStep = Math.ceil(data.length / 7);

  return (
    <div className="sa-chart-container" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="sa-chart-svg">
        {/* Y Grid Lines & Labels */}
        {yTicks.map((val, idx) => {
          const y = padding.top + chartHeight - (val / maxLitres) * chartHeight;
          return (
            <g key={idx}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="sa-chart-axis-text">
                {val}L
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, index) => {
          const barHeight = (d.litres / maxLitres) * chartHeight;
          const x = padding.left + index * step + (step - barWidth) / 2;
          const y = padding.top + chartHeight - barHeight;

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx="3"
              className="sa-bar-rect"
              fill="#2ECC71"
              onMouseEnter={() => setHoveredBar({ date: d.date, litres: d.litres, x: x + barWidth / 2, y })}
              onMouseLeave={() => setHoveredBar(null)}
            />
          );
        })}

        {/* X Axis Labels */}
        {data.map((d, index) => {
          if (index % labelStep !== 0 && index !== data.length - 1) return null;
          const x = padding.left + index * step + step / 2;
          return (
            <text key={index} x={x} y={height - 12} textAnchor="middle" className="sa-chart-axis-text">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredBar && (
        <div
          className="sa-chart-tooltip"
          style={{
            position: "absolute",
            left: `${(hoveredBar.x / width) * 100}%`,
            top: `${(hoveredBar.y / height) * 100}%`,
            transform: "translate(-50%, -120%)",
          }}
        >
          <div className="sa-tooltip-date">{hoveredBar.date}</div>
          <div className="sa-tooltip-value">{hoveredBar.litres} Litres</div>
        </div>
      )}
    </div>
  );
};
