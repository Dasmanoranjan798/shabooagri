import React from "react";
import { Briefcase } from "lucide-react";
import type { Employee } from "../../types/employee";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

interface EmployeeDetailModalProps {
 employee: Employee | null;
 isOpen: boolean;
 onClose: () => void;
 onEdit: (employee: Employee) => void;
 onDelete: (id: string) => void;
 canEdit?: boolean;
 canDelete?: boolean;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
 employee,
 isOpen,
 onClose,
 onEdit,
 onDelete,
 canEdit = true,
 canDelete = true,
}) => {
 if (!employee) return null;

 const roleTitle = employee.roleTitle || "Company Staff";
 const phone = employee.phone || "No phone listed";

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={
 <div className="sa-modal-booking-title">
 <span>{employee.name}</span>
 <Badge variant={getStatusBadgeVariant(employee.employmentStatus)}>
 {employee.employmentStatus}
 </Badge>
 </div>
 }
 maxWidth="500px"
 >
 <div className="sa-employee-detail-body">
 {/* Profile Summary Banner */}
 <div className="sa-field-header-card">
 <div className="sa-field-machine">
 <span className="sa-field-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <Briefcase size={28} color="var(--color-primary)" />
 </span>
 <div>
 <h3>{employee.name}</h3>
 <span className="sa-field-sub">
 {roleTitle} • Phone: {phone}
 </span>
 </div>
 </div>
 </div>

 {/* Employee Key Details Grid */}
 <div className="sa-detail-grid" style={{ marginTop: "1rem" }}>
 <div className="sa-detail-item">
 <span className="sa-detail-label"> Full Name</span>
 <span className="sa-detail-val">{employee.name}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Title / Role</span>
 <span className="sa-detail-val">{roleTitle}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Mobile Contact</span>
 <span className="sa-detail-val">{phone}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Joined Date</span>
 <span className="sa-detail-val">
 {employee.joinedDate ? employee.joinedDate.slice(0, 10) : "N/A"}
 </span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label">Employment Status</span>
 <span className="sa-detail-val">
 <Badge variant={getStatusBadgeVariant(employee.employmentStatus)} size="sm">
 {employee.employmentStatus}
 </Badge>
 </span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> System Account</span>
 <span className="sa-detail-val">
 {employee.userId ? "Linked User Account" : "Staff Record Only"}
 </span>
 </div>
 </div>

 {/* Action Controls */}
 <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
 {canDelete && (
 <Button
 variant="danger"
 size="md"
 onClick={() => onDelete(employee.id)}
 >
 Delete Record
 </Button>
 )}

 {canEdit && (
 <Button
 variant="primary"
 size="md"
 onClick={() => onEdit(employee)}
 >
 Edit Staff Record
 </Button>
 )}
 </div>
 </div>
 </Modal>
 );
};
