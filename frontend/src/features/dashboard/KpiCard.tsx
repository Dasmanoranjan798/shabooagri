import React from "react";
import { Card } from "../../components/ui/Card";
import { Badge, type BadgeVariant } from "../../components/ui/Badge";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: { delta: number | null; deltaPercent: number | null } | null;
  icon: string;
  badge?: { text: string; variant?: BadgeVariant };
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  delta,
  icon,
  badge,
}) => {
  const isPositive = delta?.delta != null && delta.delta >= 0;

  return (
    <Card className="sa-kpi-card">
      <div className="sa-kpi-header">
        <span className="sa-kpi-icon">{icon}</span>
        {badge ? (
          <Badge variant={badge.variant || "info"} size="sm">
            {badge.text}
          </Badge>
        ) : delta && delta.deltaPercent != null ? (
          <span className={`sa-kpi-delta ${isPositive ? "is-up" : "is-down"}`}>
            {isPositive ? "↑ +" : "↓ "}
            {delta.deltaPercent}%
          </span>
        ) : null}
      </div>

      <div className="sa-kpi-body">
        <span className="sa-kpi-value">{value}</span>
        <span className="sa-kpi-title">{title}</span>
        {subtitle && <span className="sa-kpi-subtitle">{subtitle}</span>}
      </div>
    </Card>
  );
};
