import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

interface PlaceholderPageProps {
  title: string;
  icon: string;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  icon,
  description,
}) => {
  return (
    <div className="sa-placeholder-container">
      <Card>
        <div className="sa-placeholder-body">
          <span className="sa-placeholder-icon">{icon}</span>
          <h2>{title}</h2>
          <Badge variant="info">Module Coming in Phase 1 Rollout</Badge>
          <p>{description}</p>
          <div className="sa-placeholder-actions">
            <Link to="/" className="sa-btn sa-btn-primary">
              ← Return to Dashboard
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
