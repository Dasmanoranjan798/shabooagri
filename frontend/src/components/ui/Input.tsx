import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="sa-input-group">
        {label && <label className="sa-input-label">{label}</label>}
        <div className="sa-input-wrapper">
          {icon && <span className="sa-input-icon">{icon}</span>}
          <input
            ref={ref}
            className={`sa-input ${icon ? "has-icon" : ""} ${error ? "is-invalid" : ""} ${className}`}
            {...props}
          />
        </div>
        {error && <span className="sa-input-error">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
