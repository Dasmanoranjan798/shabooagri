import React, { useEffect, useState } from "react";
import type { CreateEmployeePayload, Employee, EmploymentStatus } from "../../types/employee";
import { api } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: Employee | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit,
}) => {
  const [name, setName] = useState<string>("");
  const [roleTitle, setRoleTitle] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>("ACTIVE");
  const [joinedDate, setJoinedDate] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setName(employeeToEdit.name);
      setRoleTitle(employeeToEdit.roleTitle || "");
      setPhone(employeeToEdit.phone || "");
      setEmploymentStatus(employeeToEdit.employmentStatus || "ACTIVE");
      setJoinedDate(
        employeeToEdit.joinedDate ? employeeToEdit.joinedDate.slice(0, 10) : ""
      );
    } else {
      setName("");
      setRoleTitle("");
      setPhone("");
      setEmploymentStatus("ACTIVE");
      setJoinedDate("");
    }
  }, [employeeToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter employee name");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateEmployeePayload = {
      name: name.trim(),
      roleTitle: roleTitle.trim() || undefined,
      phone: phone.trim() || undefined,
      employmentStatus,
      joinedDate: joinedDate || undefined,
    };

    try {
      if (employeeToEdit) {
        await api.updateEmployee(employeeToEdit.id, payload);
      } else {
        await api.createEmployee(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save employee record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employeeToEdit ? `Edit Staff Member — ${employeeToEdit.name}` : "Register New Staff Member"}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}

        {/* 1. Full Name */}
        <Input
          label="Full Name *"
          type="text"
          placeholder="e.g. Suresh Patel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* 2. Role Title / Designation & Phone */}
        <div className="sa-form-grid-2">
          <Input
            label="Designation / Role Title"
            type="text"
            placeholder="e.g. Fleet Manager, Mechanic"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
          />

          <Input
            label="Mobile Phone Number"
            type="tel"
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* 3. Employment Status & Joined Date */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <label className="sa-input-label">Employment Status</label>
            <select
              className="sa-input"
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
            >
              <option value="ACTIVE">Active Staff</option>
              <option value="INACTIVE">Inactive / Resigned</option>
            </select>
          </div>

          <Input
            label="Joined Date"
            type="date"
            value={joinedDate}
            onChange={(e) => setJoinedDate(e.target.value)}
          />
        </div>

        {/* Form Actions */}
        <div className="sa-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {employeeToEdit ? "Save Changes" : "Register Staff Member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
