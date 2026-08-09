import React from "react";
import type { Machine } from "../../types/machine";
import type { CompanyProfile } from "../../types/settings";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Clock, Wrench, ShieldAlert } from "lucide-react";
import { getMachineServiceWarning, getMachineInsuranceWarning } from "../../lib/operationalWarnings";

interface MachineDetailModalProps {
 machine: Machine | null;
 company?: CompanyProfile | null;
 isOpen: boolean;
 onClose: () => void;
 onEdit: (machine: Machine) => void;
 onDelete: (id: string) => void;
}

export const MachineDetailModal: React.FC<MachineDetailModalProps> = ({
 machine,
 company,
 isOpen,
 onClose,
 onEdit,
 onDelete,
}) => {
 const machineTerm = getTerm("machine");
 const driverTerm = getTerm("driver");

 if (!machine) return null;

 const driverName = machine.assignedDriver?.employee?.name || "Unassigned";
 const typeName = machine.machineType?.name || "Equipment";

 const serviceWarning = getMachineServiceWarning(machine, company);
 const insuranceWarning = getMachineInsuranceWarning(machine, company);

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={
 <div className="sa-modal-booking-title">
 <span>{machine.registrationNumber}</span>
 <Badge variant={getStatusBadgeVariant(machine.status)}>
 {machine.status}
 </Badge>
 </div>
 }
 maxWidth="600px"
 >
 <div className="sa-machine-detail-body">
 {/* Header Summary Banner */}
 <div className="sa-field-header-card">
 <div className="sa-field-machine">
 <span className="sa-field-icon"></span>
 <div>
 <h3>{machine.brand} {machine.model || ""}</h3>
 <span className="sa-field-sub">
 {typeName} • {machine.fuelType} • Reg: {machine.registrationNumber}
 </span>
 </div>
 </div>
 </div>

 {/* Operational Warnings Banner */}
 {(serviceWarning.hasWarning || insuranceWarning.hasWarning) && (
   <div style={{ background: "var(--color-warning-bg, #fffbe6)", border: "1px solid var(--color-warning-border, #ffe58f)", borderRadius: "8px", padding: "12px 14px", marginTop: "1rem", display: "flex", flexDirection: "column", gap: "8px" }}>
     {serviceWarning.hasWarning && (
       <div style={{ display: "flex", alignItems: "center", gap: "8px", color: serviceWarning.isOverdue ? "#dc2626" : "#d97706", fontWeight: 600, fontSize: "0.85rem" }}>
         <Wrench size={16} />
         <span>Service Alert: {serviceWarning.message}</span>
       </div>
     )}
     {insuranceWarning.hasWarning && (
       <div style={{ display: "flex", alignItems: "center", gap: "8px", color: insuranceWarning.isOverdue ? "#dc2626" : "#d97706", fontWeight: 600, fontSize: "0.85rem" }}>
         <ShieldAlert size={16} />
         <span>Insurance Alert: {insuranceWarning.message}</span>
       </div>
     )}
   </div>
 )}

 {/* Operational Key Metrics Grid */}
 <div className="sa-detail-grid" style={{ marginTop: "1rem" }}>
 <div className="sa-detail-item">
 <span className="sa-detail-label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
   <Clock size={14} /> Hour Meter Reading
 </span>
 <span className="sa-detail-val" style={{ fontSize: "1.1rem", color: "#1b7a3e" }}>
 {machine.hourMeterReading} hrs
 </span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Default {driverTerm}</span>
 <span className="sa-detail-val">{driverName}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Next Service Due</span>
 <span
 className="sa-detail-val"
 style={serviceWarning.hasWarning ? { color: serviceWarning.isOverdue ? "#dc2626" : "#d97706", fontWeight: 800 } : {}}
 >
 {machine.nextServiceDueHours != null
 ? serviceWarning.hasWarning
 ? serviceWarning.message
 : `${Number(machine.nextServiceDueHours) - Number(machine.hourMeterReading)} hrs left (${machine.nextServiceDueHours} hrs)`
 : "Not scheduled"}
 </span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Purchase Year</span>
 <span className="sa-detail-val">{machine.purchaseYear || "N/A"}</span>
 </div>
 </div>

 {/* Machine Financial & Operational Stats Banner */}
 <div className="sa-portal-kpi-row" style={{ marginTop: "12px", gap: "8px" }}>
 <div className="sa-portal-kpi-card" style={{ padding: "8px 12px" }}>
 <div className="sa-portal-kpi-label">Today's Hours</div>
 <div className="sa-portal-kpi-value" style={{ fontSize: "1.1rem" }}>
 {(machine as any).stats?.todayHours ?? 0} hrs
 </div>
 </div>
 <div className="sa-portal-kpi-card" style={{ padding: "8px 12px" }}>
 <div className="sa-portal-kpi-label">Today's Income</div>
 <div className="sa-portal-kpi-value" style={{ fontSize: "1.1rem", color: "var(--color-primary)" }}>
 ₹{(machine as any).stats?.todayIncome ?? 0}
 </div>
 </div>
 <div className="sa-portal-kpi-card" style={{ padding: "8px 12px" }}>
 <div className="sa-portal-kpi-label">This Month Income</div>
 <div className="sa-portal-kpi-value" style={{ fontSize: "1.1rem", color: "#2563eb" }}>
 ₹{(machine as any).stats?.thisMonthIncome ?? 0}
 </div>
 </div>
 </div>

 {/* Insurance Info */}
 <div className="sa-notes-section">
 <h4>Insurance Details</h4>
 <div className="sa-detail-grid" style={{ marginBottom: 0 }}>
 <div className="sa-detail-item">
 <span className="sa-detail-label">Policy Number</span>
 <span className="sa-detail-val">{machine.insuranceNumber || "N/A"}</span>
 </div>
 <div className="sa-detail-item">
 <span className="sa-detail-label">Expiry Date</span>
 <span className="sa-detail-val">
 {machine.insuranceExpiryDate ? machine.insuranceExpiryDate.slice(0, 10) : "N/A"}
 </span>
 </div>
 </div>
 </div>

 {/* Action Controls */}
 <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
 <Button
 variant="danger"
 size="md"
 onClick={() => onDelete(machine.id)}
 >
 Delete Machine
 </Button>

 <Button
 variant="primary"
 size="md"
 onClick={() => onEdit(machine)}
 >
 Edit {machineTerm}
 </Button>
 </div>
 </div>
 </Modal>
 );
};
