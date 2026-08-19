import React from "react";
import "./Badge/badge.css";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  className = "",
}) => {
  const isWorking = children?.toString().toUpperCase() === "WORKING";
  return (
    <span className={`sa-badge sa-badge-${variant} sa-badge-${size} ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {isWorking && (
        <span className="sa-badge-pulse-indicator"></span>
      )}
      {children}
    </span>
  );
};

export function getStatusBadgeVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === "WORKING" || s === "COMPLETED" || s === "PAID" || s === "ACTIVE") return "success";
  if (s === "PENDING" || s === "PARTIALLY_PAID" || s === "REPAIR" || s === "PAUSED") return "warning";
  if (s === "CANCELLED" || s === "UNPAID" || s === "INACTIVE" || s === "OFFLINE" || s === "VOIDED") return "danger";
  if (s === "AVAILABLE" || s === "ACCEPTED") return "info";
  if (s === "STOPPED" || s === "ON THE WAY" || s === "ON_THE_WAY") return "purple";
  return "neutral";
}
