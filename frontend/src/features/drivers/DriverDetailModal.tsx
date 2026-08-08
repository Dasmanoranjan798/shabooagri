import React from "react";
import type { Driver } from "../../types/driver";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

interface DriverDetailModalProps {
  driver: Driver | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (driver: Driver) => void;
  onDelete: (id: string) => void;
}

export const DriverDetailModal: React.FC<DriverDetailModalProps> = ({
  driver,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const driverTerm = getTerm("driver");

  if (!driver) return null;

  const empName = driver.employee.name;
  const designation = driver.employee.designation || "Equipment Operator";
  const phone = driver.employee.phone || "No phone listed";

  const isExpired =
    driver.licenseExpiryDate && new Date(driver.licenseExpiryDate) < new Date();

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
            <span className="sa-field-icon">👨‍🌾</span>
            <div>
              <h3>{empName}</h3>
              <span className="sa-field-sub">
                {designation} • Phone: {phone}
              </span>
            </div>
          </div>
        </div>

        {/* Driver Key Details Grid */}
        <div className="sa-detail-grid" style={{ marginTop: "1rem" }}>
          <div className="sa-detail-item">
            <span className="sa-detail-label">🪪 License Number</span>
            <span className="sa-detail-val">{driver.licenseNumber || "N/A"}</span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">📅 License Expiry Date</span>
            <span className="sa-detail-val" style={{ color: isExpired ? "#dc2626" : "inherit" }}>
              {driver.licenseExpiryDate ? driver.licenseExpiryDate.slice(0, 10) : "N/A"}
              {isExpired && " (Expired)"}
            </span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">📊 Availability Status</span>
            <span className="sa-detail-val">
              <Badge variant={getStatusBadgeVariant(driver.availabilityStatus)} size="sm">
                {driver.availabilityStatus.replace(/_/g, " ")}
              </Badge>
            </span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">📞 Mobile Contact</span>
            <span className="sa-detail-val">{phone}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
          <Button
            variant="danger"
            size="md"
            onClick={() => onDelete(driver.id)}
          >
            🗑️ Delete Profile
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => onEdit(driver)}
          >
            ✏️ Edit {driverTerm} Profile
          </Button>
        </div>
      </div>
    </Modal>
  );
};
