import React from "react";
import { subscribeDataRefreshMany } from "../../lib/dataRefreshBus";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { ChangePasswordCard } from "../../components/ChangePasswordCard";
import { ChangePinCard } from "../../components/ChangePinCard";
import { Button } from "../../components/ui/Button";
import { getTerm } from "../../lib/terminology";

export const DriverProfilePage: React.FC = () => {
 const driverTerm = getTerm("driver");
 const { user, logout } = useAuth();
 const navigate = useNavigate();
 const [compSummary, setCompSummary] = React.useState<any>(null);

 React.useEffect(() => {
 async function loadComp() {
 if (!user) return;
 try {
 const drivers = await api.listDrivers();
 const myDriver = drivers.find((d: any) => d.employee?.userId === user.id || d.employee?.phone === user.mobileNumber);
 if (myDriver) {
 const comp = await api.getDriverCompensation(myDriver.id);
 setCompSummary(comp);
 }
 } catch (err) {
 console.error("Failed to load driver compensation summary:", err);
 }
 }
 loadComp();
 return subscribeDataRefreshMany(["drivers", "jobs"], loadComp);
 }, [user]);

 const handleLogout = () => {
 logout();
 navigate("/login");
 };

 return (
 <div className="sa-driver-page">
 <div className="sa-driver-section-title"> Profile & Earnings Info</div>

 <div className="sa-driver-profile-card">
 <div className="sa-driver-profile-avatar">
 {user?.fullName?.[0]?.toUpperCase() ?? "D"}
 </div>
 <div className="sa-driver-profile-name">{user?.fullName ?? driverTerm}</div>
 <div className="sa-driver-profile-role">{driverTerm}</div>
 </div>

 <div className="sa-driver-detail-grid">
 {[
 { label: "Full Name", value: user?.fullName ?? "—" },
 { label: "Email", value: user?.email ?? "—" },
 { label: "Mobile", value: user?.mobileNumber ?? "—" },
 { label: "Status", value: user?.status === "ACTIVE" ? " Active" : " Inactive" },
 ].map((item) => (
 <div key={item.label} className="sa-driver-detail-item">
 <div className="sa-driver-detail-label">{item.label}</div>
 <div className="sa-driver-detail-value">{item.value}</div>
 </div>
 ))}
 </div>

 {compSummary && (
 <div style={{ background: "var(--color-surface)", borderRadius: "8px", padding: "16px", marginTop: "16px", border: "1px solid var(--color-border)" }}>
 <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-primary-dark)", marginBottom: "8px" }}>
 Work History & Compensation Model
 </div>
 <div style={{ fontSize: "0.85rem", color: "var(--color-text)", marginBottom: "4px" }}>
 <strong>Model:</strong> {compSummary.compensationType === "HOURLY" ? "Hourly Wage" : compSummary.compensationType === "MONTHLY" ? "Monthly Salaried" : "Yearly Salaried"}
 </div>
 <div style={{ fontSize: "0.85rem", color: "var(--color-text)", marginBottom: "4px" }}>
 <strong>Total Completed Jobs:</strong> {compSummary.totalCompletedJobs} jobs ({compSummary.totalWorkedHours} worked hrs)
 </div>
 <div style={{ fontSize: "0.85rem", color: "var(--color-text)", marginBottom: "4px" }}>
 <strong>Compensation Calculation:</strong> {compSummary.explanation}
 </div>
 <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-primary)", marginTop: "8px" }}>
 Current Amount: ₹{compSummary.calculatedEarnings.toLocaleString("en-IN")}
 </div>
 </div>
 )}

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
