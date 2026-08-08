import React, { useEffect, useState } from "react";
import type { Booking, BookingAttachment, BookingStatus, DriverOption, MachineOption } from "../../types/booking";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

interface BookingDetailModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const customerTerm = getTerm("customer");
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");

  const [attachments, setAttachments] = useState<BookingAttachment[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isAssigningMachine, setIsAssigningMachine] = useState<boolean>(false);
  const [isAssigningDriver, setIsAssigningDriver] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !booking) return;

    const targetBookingId = booking.id;
    setSelectedMachineId(booking.machineId || "");
    setSelectedDriverId(booking.driverId || "");

    async function loadData() {
      try {
        const [attList, mList, dList] = await Promise.all([
          api.listBookingAttachments(targetBookingId),
          api.listMachines(),
          api.listDrivers(),
        ]);
        setAttachments(attList);
        setMachines(mList);
        setDrivers(dList);
      } catch (err: any) {
        console.error("Failed to load booking details:", err);
      }
    }

    loadData();
  }, [isOpen, booking]);

  if (!booking) return null;

  const handleStatusChange = async (nextStatus: BookingStatus) => {
    setIsUpdatingStatus(true);
    setError(null);
    try {
      await api.updateBookingStatus(booking.id, nextStatus);
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to update booking status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleMachineAssign = async () => {
    setIsAssigningMachine(true);
    setError(null);
    try {
      await api.assignBookingMachine(booking.id, selectedMachineId || null);
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to assign machine");
    } finally {
      setIsAssigningMachine(false);
    }
  };

  const handleDriverAssign = async () => {
    setIsAssigningDriver(true);
    setError(null);
    try {
      await api.assignBookingDriver(booking.id, selectedDriverId || null);
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Failed to assign driver");
    } finally {
      setIsAssigningDriver(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setError(null);
    try {
      await api.uploadBookingAttachment(booking.id, uploadFile);
      setUploadFile(null);
      const updatedAttachments = await api.listBookingAttachments(booking.id);
      setAttachments(updatedAttachments);
    } catch (err: any) {
      setError(err.message || "Failed to upload photo attachment");
    } finally {
      setIsUploading(false);
    }
  };

  // Determine allowed legal status transitions graph
  const getNextStatusOptions = (status: BookingStatus): { next: BookingStatus; label: string }[] => {
    if (status === "PENDING") return [{ next: "ACCEPTED", label: "Accept Booking" }];
    if (status === "ACCEPTED") return [{ next: "ON_THE_WAY", label: "On the Way" }];
    if (status === "ON_THE_WAY") return [{ next: "WORKING", label: "Start Working" }];
    if (status === "WORKING") return [{ next: "COMPLETED", label: "Mark Completed" }];
    return [];
  };

  const canCancel = !["COMPLETED", "CANCELLED"].includes(booking.status);
  const nextOptions = getNextStatusOptions(booking.status);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="sa-modal-booking-title">
          <span>Booking {booking.bookingNumber}</span>
          <Badge variant={getStatusBadgeVariant(booking.status)}>
            {booking.status.replace(/_/g, " ")}
          </Badge>
        </div>
      }
      maxWidth="650px"
    >
      <div className="sa-booking-detail-body">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}

        {/* Status Transition Action Bar */}
        {(nextOptions.length > 0 || canCancel) && (
          <div className="sa-status-action-bar">
            <span className="sa-action-bar-label">Next Workflow Action:</span>
            <div className="sa-action-bar-buttons">
              {nextOptions.map((opt) => (
                <Button
                  key={opt.next}
                  variant="primary"
                  size="sm"
                  isLoading={isUpdatingStatus}
                  onClick={() => handleStatusChange(opt.next)}
                >
                  ▶ {opt.label}
                </Button>
              ))}
              {canCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isUpdatingStatus}
                  onClick={() => handleStatusChange("CANCELLED")}
                >
                  ✕ Cancel Booking
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Grid Details */}
        <div className="sa-detail-grid">
          <div className="sa-detail-item">
            <span className="sa-detail-label">👤 {customerTerm}</span>
            <span className="sa-detail-val">{booking.customer.name}</span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">🏘️ Village</span>
            <span className="sa-detail-val">{booking.village.name}</span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">📅 Scheduled Date</span>
            <span className="sa-detail-val">{booking.scheduledDate.slice(0, 10)}</span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">🕒 Scheduled Time</span>
            <span className="sa-detail-val">
              {booking.scheduledTime ? booking.scheduledTime.slice(11, 16) : "Not set"}
            </span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">🏷️ Rate & Method</span>
            <span className="sa-detail-val">
              {formatCurrency(booking.rate)} / {booking.pricingMethod.label}
            </span>
          </div>

          <div className="sa-detail-item">
            <span className="sa-detail-label">💰 Estimated Amount</span>
            <span className="sa-detail-val sa-amount-bold">
              {booking.estimatedAmount != null ? formatCurrency(booking.estimatedAmount) : "N/A"}
            </span>
          </div>
        </div>

        {/* Machine & Driver Assignment Section */}
        <div className="sa-assign-section">
          <h4>Fleet & Operator Assignment</h4>
          <div className="sa-form-grid-2">
            <div className="sa-input-group">
              <label className="sa-input-label">{machineTerm}</label>
              <div className="sa-inline-assign">
                <select
                  className="sa-input"
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                >
                  <option value="">-- Unassigned --</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.registrationNumber} {m.brand ? `(${m.brand})` : ""}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isAssigningMachine}
                  onClick={handleMachineAssign}
                >
                  Assign
                </Button>
              </div>
            </div>

            <div className="sa-input-group">
              <label className="sa-input-label">{driverTerm}</label>
              <div className="sa-inline-assign">
                <select
                  className="sa-input"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  <option value="">-- Unassigned --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.employee.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isAssigningDriver}
                  onClick={handleDriverAssign}
                >
                  Assign
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="sa-notes-section">
            <h4>Notes & Instructions</h4>
            <p className="sa-notes-text">{booking.notes}</p>
          </div>
        )}

        {/* Attachments Section */}
        <div className="sa-attachments-section">
          <h4>Photo Attachments</h4>
          {attachments.length > 0 ? (
            <div className="sa-attachment-grid">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sa-attachment-item"
                >
                  <img src={att.fileUrl} alt="Booking attachment" className="sa-attachment-img" />
                </a>
              ))}
            </div>
          ) : (
            <p className="sa-text-muted" style={{ fontSize: "0.85rem" }}>
              No photos attached to this booking yet.
            </p>
          )}

          {/* Upload attachment form */}
          <form onSubmit={handleFileUpload} className="sa-upload-form">
            <input
              type="file"
              accept="image/*"
              className="sa-input"
              style={{ fontSize: "0.8rem", padding: "0.4rem" }}
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              isLoading={isUploading}
              disabled={!uploadFile}
            >
              Upload Photo
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
