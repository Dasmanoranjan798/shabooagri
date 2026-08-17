import React from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import type { Customer } from "../../types/customer";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

interface CustomerDetailModalProps {
 customer: Customer | null;
 isOpen: boolean;
 onClose: () => void;
 onEdit: (customer: Customer) => void;
 onDelete: (id: string) => void;
 canManage: boolean;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
 customer,
 isOpen,
 onClose,
 onEdit,
 onDelete,
 canManage,
}) => {
 const navigate = useNavigate();
 const customerTerm = getTerm("customer");
 const villageTerm = getTerm("village");
 const bookingTerm = getTerm("booking");

 if (!customer) return null;

 const handleCreateBooking = () => {
 onClose();
 navigate("/bookings");
 };

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={
 <div className="sa-modal-booking-title">
 <span>{customer.name}</span>
 </div>
 }
 maxWidth="550px"
 >
 <div className="sa-customer-detail-body">
 {/* Profile Summary Banner */}
 <div className="sa-field-header-card">
 <div className="sa-field-machine">
 <span className="sa-field-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <Users size={28} color="var(--color-primary)" />
 </span>
 <div>
 <h3>{customer.name}</h3>
 <span className="sa-field-sub">
 {villageTerm}: {customer.village?.name || villageTerm} • Phone: {customer.phone || "No phone listed"}
 </span>
 </div>
 </div>
 </div>

 {/* Customer Key Details Grid */}
 <div className="sa-detail-grid" style={{ marginTop: "1rem" }}>
 <div className="sa-detail-item">
 <span className="sa-detail-label"> {customerTerm} Name</span>
 <span className="sa-detail-val">{customer.name}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> {villageTerm}</span>
 <span className="sa-detail-val">{customer.village?.name}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Mobile Contact</span>
 <span className="sa-detail-val">{customer.phone || "N/A"}</span>
 </div>

 <div className="sa-detail-item">
 <span className="sa-detail-label"> Portal Access</span>
 <span className="sa-detail-val">
 {customer.userId ? "Linked to Portal Account" : "Standard Record"}
 </span>
 </div>
 </div>

 {/* Address Section */}
 {customer.address && (
 <div className="sa-notes-section">
 <h4>Address / Field Location</h4>
 <p className="sa-notes-text">{customer.address}</p>
 </div>
 )}

 {/* Notes Section */}
 {customer.notes && (
 <div className="sa-notes-section">
 <h4>Customer Notes</h4>
 <p className="sa-notes-text">{customer.notes}</p>
 </div>
 )}

 {/* Action Controls */}
 <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
 {canManage && (
 <Button
 variant="danger"
 size="md"
 onClick={() => onDelete(customer.id)}
 >
 Delete
 </Button>
 )}

 {canManage && (
 <Button
 variant="secondary"
 size="md"
 onClick={() => onEdit(customer)}
 >
 Edit Profile
 </Button>
 )}

 <Button
 variant="primary"
 size="md"
 onClick={handleCreateBooking}
 >
 New {bookingTerm}
 </Button>
 </div>
 </div>
 </Modal>
 );
};
