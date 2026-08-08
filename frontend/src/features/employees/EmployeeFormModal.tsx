import React, { useEffect, useState } from "react";
import type { CompensationType, CreateEmployeePayload, Employee, EmploymentStatus } from "../../types/employee";
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
  const [compensationType, setCompensationType] = useState<CompensationType>("HOURLY");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [monthlySalary, setMonthlySalary] = useState<string>("");
  const [yearlySalary, setYearlySalary] = useState<string>("");
  const [joinedDate, setJoinedDate] = useState<string>("");

  // Grant Login Access state
  const [grantLogin, setGrantLogin] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("Password123!");
  const [userRole, setUserRole] = useState<"manager" | "driver">("driver");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setName(employeeToEdit.name);
      setRoleTitle(employeeToEdit.roleTitle || "");
      setPhone(employeeToEdit.phone || "");
      setEmploymentStatus(employeeToEdit.employmentStatus || "ACTIVE");
      setCompensationType(employeeToEdit.compensationType || "HOURLY");
      setHourlyRate(employeeToEdit.hourlyRate ? String(employeeToEdit.hourlyRate) : "");
      setMonthlySalary(employeeToEdit.monthlySalary ? String(employeeToEdit.monthlySalary) : "");
      setYearlySalary(employeeToEdit.yearlySalary ? String(employeeToEdit.yearlySalary) : "");
      setJoinedDate(
        employeeToEdit.joinedDate ? employeeToEdit.joinedDate.slice(0, 10) : ""
      );
    } else {
      setName("");
      setRoleTitle("");
      setPhone("");
      setEmploymentStatus("ACTIVE");
      setCompensationType("HOURLY");
      setHourlyRate("");
      setMonthlySalary("");
      setYearlySalary("");
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

    try {
      let createdUserId: string | undefined = undefined;

      if (!employeeToEdit && grantLogin) {
        if (!email.trim() && !phone.trim()) {
          setError("Email or Phone is required to create a user account");
          setIsSubmitting(false);
          return;
        }
        const userRes = await api.register({
          fullName: name.trim(),
          email: email.trim() || undefined,
          mobileNumber: phone.trim() || undefined,
          password: password || "Password123!",
          roleKey: userRole,
        });
        createdUserId = userRes.user.id;
      }

      const payload: CreateEmployeePayload = {
        name: name.trim(),
        roleTitle: roleTitle.trim() || undefined,
        phone: phone.trim() || undefined,
        employmentStatus,
        compensationType,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        monthlySalary: monthlySalary ? Number(monthlySalary) : undefined,
        yearlySalary: yearlySalary ? Number(yearlySalary) : undefined,
        joinedDate: joinedDate || undefined,
        userId: createdUserId,
      };

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

        {/* 4. Compensation Model */}
        <div className="sa-form-grid-2" style={{ background: "var(--color-surface-secondary)", padding: "10px", borderRadius: "6px" }}>
          <div className="sa-input-group">
            <label className="sa-input-label">Compensation Type</label>
            <select
              className="sa-input"
              value={compensationType}
              onChange={(e) => setCompensationType(e.target.value as CompensationType)}
            >
              <option value="HOURLY">Hourly Wage (₹/hr × Job Hours)</option>
              <option value="MONTHLY">Monthly Salary (Fixed ₹/month)</option>
              <option value="YEARLY">Yearly Salary (Fixed ₹/year)</option>
            </select>
          </div>

          {compensationType === "HOURLY" && (
            <Input
              label="Hourly Rate (₹/hr)"
              type="number"
              placeholder="e.g. 200"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          )}

          {compensationType === "MONTHLY" && (
            <Input
              label="Monthly Salary (₹/month)"
              type="number"
              placeholder="e.g. 25000"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
            />
          )}

          {compensationType === "YEARLY" && (
            <Input
              label="Yearly Salary (₹/year)"
              type="number"
              placeholder="e.g. 300000"
              value={yearlySalary}
              onChange={(e) => setYearlySalary(e.target.value)}
            />
          )}
        </div>

        {/* 5. Optional User Account Creation */}
        {!employeeToEdit && (
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={grantLogin}
                onChange={(e) => setGrantLogin(e.target.checked)}
              />
              🔑 Grant ShabooAgri Login Account
            </label>

            {grantLogin && (
              <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", marginTop: "8px" }}>
                <div className="sa-form-grid-2">
                  <div className="sa-input-group">
                    <label className="sa-input-label">Account Role *</label>
                    <select
                      className="sa-input"
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as "manager" | "driver")}
                    >
                      <option value="driver">Driver / Operator</option>
                      <option value="manager">Manager / Field Coordinator</option>
                    </select>
                  </div>
                  <Input
                    label="Email Address (Optional)"
                    type="email"
                    placeholder="e.g. staff@shabooagri.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Input
                  label="Initial Password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                />
              </div>
            )}
          </div>
        )}

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
