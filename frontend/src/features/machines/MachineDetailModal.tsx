import React from "react";
import type { Machine } from "../../types/machine";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

interface MachineDetailModalProps {
  machine: Machine | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (machine: Machine) => void;
  onDelete: (id: string) => void;
}

export const MachineDetailModal: React.FC<MachineDetailModalProps> = ({
  machine,
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
            <span className="sa-field-icon">🚜</span>
            <div>
              <h3>{machine.brand} {machine.model || ""}</h3>
              <span className="sa-field-sub">
                {typeName} • {machine.fuelType} • Reg: {machine.registrationNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Key Metrics Grid */}
        <div className="sa-detail-grid" style={{ marginTop: "1rem" }}>
          <div className="sa-detail-item">
            <span className="sa-detail-label">⏱️ Hour Meter Reading</span>
            <span className="sa-detail-val" style={{ fontSize: "1.1rem", color: "#1b7a3e" }}>
              {machine.hourMeterReading} hrs
            </span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">👨‍🌾 Default {driverTerm}</span>
            <span className="sa-detail-val">{driverName}</span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">🔧 Next Service Due</span>
            <span
              className="sa-detail-val"
              style={
                machine.nextServiceDueHours != null &&
                machine.nextServiceDueHours - machine.hourMeterReading <= 20
                  ? { color: "var(--color-danger)", fontWeight: 800 }
                  : {}
              }
            >
              {machine.nextServiceDueHours != null
                ? machine.nextServiceDueHours - machine.hourMeterReading <= 20
                  ? `⚠️ ${machine.nextServiceDueHours - machine.hourMeterReading} hrs left (Service Due Soon)`
                  : `${machine.nextServiceDueHours - machine.hourMeterReading} hrs left (${machine.nextServiceDueHours} hrs)`
                : "Not scheduled"}
            </span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">📅 Purchase Year</span>
            <span className="sa-detail-val">{machine.purchaseYear || "N/A"}</span>
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
            🗑️ Delete Machine
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => onEdit(machine)}
          >
            ✏️ Edit {machineTerm}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
