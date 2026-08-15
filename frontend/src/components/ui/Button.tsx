import React from "react";
import "./Button/button.css";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "warning" | "success" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case "secondary":
        return "sa-btn-secondary";
      case "outline":
        return "sa-btn-secondary";
      case "danger":
        return "sa-btn-danger";
      case "warning":
        return "sa-btn-primary";
      case "success":
        return "sa-btn-primary";
      case "ghost":
        return "sa-btn-text";
      default:
        return "sa-btn-primary";
    }
  };

  const getStyleOverride = (): React.CSSProperties | undefined => {
    if (variant === "warning") {
      return { backgroundColor: "#d97706", borderColor: "#b45309", color: "#ffffff" };
    }
    if (variant === "success") {
      return { backgroundColor: "#16a34a", borderColor: "#15803d", color: "#ffffff" };
    }
    return undefined;
  };

  return (
    <button
      className={`sa-btn sa-btn-${size} ${getVariantClass()} ${className}`}
      disabled={disabled || isLoading}
      style={{ ...getStyleOverride(), ...props.style }}
      {...props}
    >
      {isLoading ? <Spinner size="sm" /> : children}
    </button>
  );
};
