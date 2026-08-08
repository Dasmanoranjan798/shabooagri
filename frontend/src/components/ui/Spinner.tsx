import React from "react";

export const Spinner: React.FC<{ size?: "sm" | "md" | "lg"; label?: string }> = ({
  size = "md",
  label = "Loading...",
}) => {
  return (
    <div className="sa-spinner-container">
      <div className={`sa-spinner sa-spinner-${size}`} />
      {label && <span className="sa-spinner-label">{label}</span>}
    </div>
  );
};
