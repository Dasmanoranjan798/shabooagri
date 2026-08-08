import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  title,
  subtitle,
  action,
}) => {
  return (
    <div className={`sa-card ${className}`}>
      {(title || action || subtitle) && (
        <div className="sa-card-header">
          <div>
            {title && <h3 className="sa-card-title">{title}</h3>}
            {subtitle && <p className="sa-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="sa-card-action">{action}</div>}
        </div>
      )}
      <div className="sa-card-body">{children}</div>
    </div>
  );
};
