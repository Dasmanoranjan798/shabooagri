import React from "react";
import { Megaphone } from "lucide-react";

// Independent of purchasing-blocked — a banner can run for any reason
// (trial notice, promotion, maintenance notice) with purchasing still
// fully enabled, or vice versa. See platform-backend SiteSettings.
export const AnnouncementBar: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div
      style={{
        backgroundColor: "var(--color-primary-dark)",
        color: "#fff",
        padding: "10px 16px",
        textAlign: "center",
        fontSize: "0.9rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Megaphone size={16} />
      <span>{message}</span>
    </div>
  );
};
