import React, { useEffect, useState } from "react";
import type {
  AvailabilityStatus,
  CreateDriverPayload,
  Driver,
  EmployeeOption,
} from "../../types/driver";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driverToEdit?: Driver | null;
}

export const DriverFormModal: React.FC<DriverFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  driverToEdit,
}) => {
  const driverTerm = getTerm("driver");

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState<string>("");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState<string>("");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("AVAILABLE");

  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadEmployees() {
      setIsLoadingEmployees(true);
      try {
        const list = await api.listEmployees();
        setEmployees(list.filter((e) => e.isActive));
        if (!driverToEdit && list.length > 0 && !employeeId) {
          setEmployeeId(list[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load employees:", err);
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    loadEmployees();
  }, [isOpen, driverToEdit]);

  useEffect(() => {
    if (driverToEdit) {
      setEmployeeId(driverToEdit.employeeId);
      setLicenseNumber(driverToEdit.licenseNumber || "");
      setLicenseExpiryDate(
        driverToEdit.licenseExpiryDate ? driverToEdit.licenseExpiryDate.slice(0, 10) : ""
      );
      setAvailabilityStatus(driverToEdit.availabilityStatus || "AVAILABLE");
    } else {
      setEmployeeId("");
      setLicenseNumber("");
      setLicenseExpiryDate("");
      setAvailabilityStatus("AVAILABLE");
    }
  }, [driverToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError("Please select an employee");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (driverToEdit) {
        await api.updateDriver(driverToEdit.id, {
          licenseNumber: licenseNumber.trim() || undefined,
          licenseExpiryDate: licenseExpiryDate || undefined,
          availabilityStatus,
        });
      } else {
        const payload: CreateDriverPayload = {
          employeeId,
          licenseNumber: licenseNumber.trim() || undefined,
          licenseExpiryDate: licenseExpiryDate || undefined,
          availabilityStatus,
        };
        await api.createDriver(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save driver profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={driverToEdit ? `Edit ${driverTerm} Profile` : `Create New ${driverTerm} Profile`}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}
        {isLoadingEmployees && <div className="sa-alert sa-alert-info">Loading employee directory...</div>}

        {/* 1. Employee Selection */}
        <div className="sa-input-group">
          <label className="sa-input-label">Select Employee *</label>
          <select
            className="sa-input"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={!!driverToEdit}
            required
          >
            <option value="">-- Select Employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.designation ? `(${emp.designation})` : ""}
              </option>
            ))}
          </select>
          {driverToEdit && (
            <span className="sa-cell-sub" style={{ marginTop: "2px" }}>
              Employee assignment cannot be changed after creation.
            </span>
          )}
        </div>

        {/* 2. License Number & Expiry Date */}
        <div className="sa-form-grid-2">
          <Input
            label="License Number"
            type="text"
            placeholder="e.g. DL-98342-2022"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            autoFocus
          />

          <Input
            label="License Expiry Date"
            type="date"
            value={licenseExpiryDate}
            onChange={(e) => setLicenseExpiryDate(e.target.value)}
          />
        </div>

        {/* 3. Availability Status */}
        <div className="sa-input-group">
          <label className="sa-input-label">Availability Status</label>
          <select
            className="sa-input"
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value as AvailabilityStatus)}
          >
            <option value="AVAILABLE">Available</option>
            <option value="ON_JOB">On Job (Assigned)</option>
            <option value="OFF_DUTY">Off Duty / Leave</option>
          </select>
        </div>

        {/* Form Actions */}
        <div className="sa-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {driverToEdit ? "Save Profile" : "Create Driver Profile"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
