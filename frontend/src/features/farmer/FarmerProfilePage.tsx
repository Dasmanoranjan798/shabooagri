import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChangePasswordCard } from "../../components/ChangePasswordCard";
import { ChangePinCard } from "../../components/ChangePinCard";
import { Button } from "../../components/ui/Button";
import { getTerm } from "../../lib/terminology";

export const FarmerProfilePage: React.FC = () => {
 const customerTerm = getTerm("customer");
 const { user, logout } = useAuth();
 const navigate = useNavigate();

 const handleLogout = () => {
 logout();
 navigate("/login");
 };

 return (
 <div className="sa-portal-page">
 <div className="sa-portal-section-title"> My Account</div>

 <div className="sa-portal-profile-card">
 <div className="sa-portal-profile-avatar">
 {user?.fullName?.[0]?.toUpperCase() ?? "F"}
 </div>
 <div className="sa-portal-profile-name">{user?.fullName ?? customerTerm}</div>
 <div className="sa-portal-profile-role">{customerTerm}</div>
 </div>

 <div className="sa-portal-detail-grid">
 {[
 { label: "Full Name", value: user?.fullName ?? "—" },
 { label: "Email", value: user?.email ?? "—" },
 { label: "Mobile", value: user?.mobileNumber ?? "—" },
 { label: "Status", value: user?.status === "ACTIVE" ? " Active" : " Inactive" },
 ].map((item) => (
 <div key={item.label} className="sa-portal-detail-item">
 <div className="sa-portal-detail-label">{item.label}</div>
 <div className="sa-portal-detail-value">{item.value}</div>
 </div>
 ))}
 </div>

 <div style={{ marginTop: "20px" }}>
 <ChangePasswordCard />
 </div>

 <div style={{ marginTop: "20px" }}>
 <ChangePinCard />
 </div>

 <Button
 variant="secondary"
 onClick={handleLogout}
 style={{ marginTop: "24px", width: "100%" }}
 >
 ⎋ Sign Out
 </Button>
 </div>
 );
};
