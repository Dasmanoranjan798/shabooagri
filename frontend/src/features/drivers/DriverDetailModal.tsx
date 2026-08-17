import React from "react";
import type { Driver } from "../../types/driver";
import type { CompanyProfile } from "../../types/settings";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { BadgeAlert, UserCheck } from "lucide-react";
import { getDriverLicenseWarning } from "../../lib/operationalWarnings";

interface DriverDetailModalProps {
 driver: Driver | null;
 company?: CompanyProfile | null;
 isOpen: boolean;
 onClose: () => void;
 onEdit: (driver: Driver) => void;
 onDelete: (id: string) => void;
 canEdit?: boolean;
 canDelete?: boolean;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
 driver,
 company,
 isOpen,
 onClose,
 onEdit,
 onDelete,
 canEdit = true,
 canDelete = true,
}) => {
 const driverTerm = getTerm("driver");

 if (!driver) return null;

 const empName = driver.employee.name;
 const designation = driver.employee.roleTitle || "Equipment Operator";
 const phone = driver.employee.phone || "No phone listed";

 const licenseWarning = getDriverLicenseWarning(driver, company);

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={
 <div className="sa-modal-booking-title">
 <span>{empName}</span>
 <Badge variant={getStatusBadgeVariant(driver.availabilityStatus)}>
 {driver.availabilityStatus.replace(/_/g, " ")}
 </Badge>
 </div>
 }
 maxWidth="550px"
 >
 <div className="sa-driver-detail-body">
 {/* Profile Summary Banner */}
 <div className="sa-field-header-card">
 <div className="sa-field-machine">
 <span className="sa-field-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <UserCheck size={28} color="var(--color-primary)" />
 </span>
 <div>
 <h3>{empName}</h3>
 <span className="sa-field-sub">
 {designation} • Phone: {phone}
 </span>
 </div>
 </div>
 </div>

 {/* License Warning Banner */}
 {licenseWarning.hasWarning && (
   <div style={{ background: licenseWarning.isOverdue ? "#fee2e2" : "#fef3c7", border: `1px solid ${licenseWarning.isOverdue ? "#fca5a5" : "#ffe58f"}`, borderRadius: "8px", padding: "12px 14px", marginTop: "1rem", display: "flex", alignItems: "center", gap: "8px", color: licenseWarning.isOverdue ? "#dc2626" : "#b45309", fontWeight: 600, fontSize: "0.85rem" }}>
     <BadgeAlert size={18} />
     <span>Driver License Alert: {licenseWarning.message}</span>
   </div>
 )}

 {/* Driver Key Details Grid */}
 <div className="sa-detail-grid" style={{ marginTop: "1rem" }}>
 <div className="sa-detail-item">
 <span className="sa-detail-label">License Number</span>
 <span className="sa-detail-val">{driver.licenseNumber || "N/A"}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> License Expiry Date</span>
 <span className="sa-detail-val" style={{ color: licenseWarning.isOverdue ? "#dc2626" : "inherit" }}>
 {driver.licenseExpiryDate ? driver.licenseExpiryDate.slice(0, 10) : "N/A"}
 {licenseWarning.isOverdue && " (Expired)"}
 </span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label">Availability Status</span>
 <span className="sa-detail-val">
 <Badge variant={getStatusBadgeVariant(driver.availabilityStatus)} size="sm">
 {driver.availabilityStatus.replace(/_/g, " ")}
 </Badge>
 </span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Mobile Contact</span>
 <span className="sa-detail-val">{phone}</span>
 </div>
 </div>

 {/* Action Controls */}
 <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
 {canDelete && (
 <Button
 variant="danger"
 size="md"
 onClick={() => onDelete(driver.id)}
 >
 Delete Profile
 </Button>
 )}

 {canEdit && (
 <Button
 variant="primary"
 size="md"
 onClick={() => onEdit(driver)}
 >
 Edit {driverTerm} Profile
 </Button>
 )}
 </div>
 </div>
 </Modal>
 );
};
