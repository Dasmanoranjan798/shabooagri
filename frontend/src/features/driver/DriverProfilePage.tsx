import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export const DriverProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sa-driver-page">
      <div className="sa-driver-section-title">👤 Profile</div>

      <div className="sa-driver-profile-card">
        <div className="sa-driver-profile-avatar">
          {user?.fullName?.[0]?.toUpperCase() ?? "D"}
        </div>
        <div className="sa-driver-profile-name">{user?.fullName ?? "Driver"}</div>
        <div className="sa-driver-profile-role">Driver / Operator</div>
      </div>

      <div className="sa-driver-detail-grid">
        {[
          { label: "Full Name", value: user?.fullName ?? "—" },
          { label: "Email", value: user?.email ?? "—" },
          { label: "Mobile", value: user?.mobileNumber ?? "—" },
          { label: "Status", value: user?.status === "ACTIVE" ? "✅ Active" : "⚠ Inactive" },
        ].map((item) => (
          <div key={item.label} className="sa-driver-detail-item">
            <div className="sa-driver-detail-label">{item.label}</div>
            <div className="sa-driver-detail-value">{item.value}</div>
          </div>
        ))}
      </div>

      <button
        className="sa-driver-action-btn sa-driver-action-btn--pause"
        onClick={handleLogout}
        style={{ marginTop: "24px" }}
      >
        ⎋ Sign Out
      </button>
    </div>
  );
};
