import React, { useEffect, useState } from "react";
import type {
  AvailabilityStatus,
  CreateDriverPayload,
  Driver,
  EmployeeOption,
} from "../../types/driver";
import type { CompensationType } from "../../types/employee";
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

  // Selection state
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [isCreatingNewEmployee, setIsCreatingNewEmployee] = useState<boolean>(false);

  // New Employee inline fields
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [roleTitle, setRoleTitle] = useState<string>("Tractor Driver");
  const [compensationType, setCompensationType] = useState<CompensationType>("HOURLY");
  const [hourlyRate, setHourlyRate] = useState<string>("300");
  const [monthlySalary, setMonthlySalary] = useState<string>("25000");
  const [yearlySalary, setYearlySalary] = useState<string>("300000");
  const [joinedDate, setJoinedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Driver Profile fields
  const [licenseNumber, setLicenseNumber] = useState<string>("");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState<string>("");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("AVAILABLE");

  // Send App Invite state
  const [sendInvite, setSendInvite] = useState<boolean>(false);
  const [driverRoleId, setDriverRoleId] = useState<string>("");

  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadInitialData() {
      setIsLoadingEmployees(true);
      try {
        const [list, roles] = await Promise.all([
          api.listEmployees(),
          api.listRoles().catch(() => []),
        ]);
        setEmployees(list.filter((e) => e.isActive));
        if (!driverToEdit && list.length > 0 && !employeeId) {
          setEmployeeId(list[0].id);
        }
        const driverRole = roles.find((r) => r.systemKey === "driver");
        if (driverRole) setDriverRoleId(driverRole.id);
      } catch (err: any) {
        console.error("Failed to load employee options:", err);
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    loadInitialData();
  }, [isOpen, driverToEdit]);

  useEffect(() => {
    if (driverToEdit) {
      setEmployeeId(driverToEdit.employeeId);
      setLicenseNumber(driverToEdit.licenseNumber || "");
      setLicenseExpiryDate(
        driverToEdit.licenseExpiryDate ? driverToEdit.licenseExpiryDate.slice(0, 10) : ""
      );
      setAvailabilityStatus(driverToEdit.availabilityStatus || "AVAILABLE");
      setIsCreatingNewEmployee(false);
    } else {
      setEmployeeId("");
      setName("");
      setEmail("");
      setPhone("");
      setRoleTitle("Tractor Driver");
      setCompensationType("HOURLY");
      setHourlyRate("300");
      setMonthlySalary("25000");
      setYearlySalary("300000");
      setJoinedDate(new Date().toISOString().slice(0, 10));
      setLicenseNumber("");
      setLicenseExpiryDate("");
      setAvailabilityStatus("AVAILABLE");
      setSendInvite(false);
      setIsCreatingNewEmployee(false);
    }
    setError(null);
  }, [driverToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (driverToEdit) {
        // Updating existing driver profile
        await api.updateDriver(driverToEdit.id, {
          licenseNumber: licenseNumber.trim() || undefined,
          licenseExpiryDate: licenseExpiryDate || undefined,
          availabilityStatus,
        });
      } else {
        let targetEmployeeId = employeeId;

        // Mode B: Quick Create New Employee first if selected
        if (isCreatingNewEmployee) {
          if (!name.trim()) {
            setError(`Please enter the ${driverTerm.toLowerCase()}'s full name`);
            setIsSubmitting(false);
            return;
          }

          const newEmployee = await api.createEmployee({
            name: name.trim(),
            phone: phone.trim() || undefined,
            roleTitle: roleTitle.trim() || "Driver",
            compensationType,
            hourlyRate: compensationType === "HOURLY" ? parseFloat(hourlyRate) || 0 : undefined,
            monthlySalary: compensationType === "MONTHLY" ? parseFloat(monthlySalary) || 0 : undefined,
            yearlySalary: compensationType === "YEARLY" ? parseFloat(yearlySalary) || 0 : undefined,
            joinedDate: joinedDate || undefined,
          });

          targetEmployeeId = newEmployee.id;
        } else if (!targetEmployeeId) {
          setError("Please select an employee or create a new one");
          setIsSubmitting(false);
          return;
        }

        // Create Driver profile
        const payload: CreateDriverPayload = {
          employeeId: targetEmployeeId,
          licenseNumber: licenseNumber.trim() || undefined,
          licenseExpiryDate: licenseExpiryDate || undefined,
          availabilityStatus,
        };
        await api.createDriver(payload);

        // Send Gmail / Email or SMS Invite if requested
        if (sendInvite && driverRoleId && (email.trim() || phone.trim())) {
          try {
            const targetName = isCreatingNewEmployee
              ? name.trim()
              : employees.find((e) => e.id === targetEmployeeId)?.name || "Driver";
            await api.createInvite({
              fullName: targetName,
              email: email.trim() || undefined,
              phone: phone.trim() || undefined,
              roleId: driverRoleId,
            });
          } catch (inviteErr: any) {
            console.warn("Failed to dispatch driver app invite:", inviteErr);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to save ${driverTerm.toLowerCase()} profile`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={driverToEdit ? `Edit ${driverTerm} Profile` : `Create New ${driverTerm} Profile`}
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}
        {isLoadingEmployees && <div className="sa-alert sa-alert-info">Loading employee directory...</div>}

        {/* 1. Employee Assignment / Quick Create Switcher */}
        {!driverToEdit && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label className="sa-input-label" style={{ margin: 0 }}>
              {isCreatingNewEmployee ? "New Driver / Employee Information *" : "Select Employee *"}
            </label>
            <button
              type="button"
              className="sa-link-action"
              onClick={() => setIsCreatingNewEmployee(!isCreatingNewEmployee)}
              style={{ fontSize: "0.82rem", fontWeight: 600 }}
            >
              {isCreatingNewEmployee ? "← Select Existing Employee" : "+ Quick Create New Employee"}
            </button>
          </div>
        )}

        {!driverToEdit && !isCreatingNewEmployee && (
          <div className="sa-input-group">
            <select
              className="sa-input"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.designation ? `(${emp.designation})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Create New Employee Form Fields */}
        {!driverToEdit && isCreatingNewEmployee && (
          <div style={{ background: "var(--color-bg)", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)", marginBottom: "16px" }}>
            <div className="sa-form-grid-2">
              <Input
                label="Full Name *"
                type="text"
                placeholder="e.g. Vijay Singh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
              <Input
                label="Mobile Phone Number"
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="sa-form-grid-2">
              <Input
                label="Gmail / Email Address"
                type="email"
                placeholder="e.g. vijay.singh@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Designation / Role Title"
                type="text"
                placeholder="e.g. Tractor Driver, Harvester Operator"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
            </div>

            {/* Compensation Model */}
            <div className="sa-form-grid-2">
              <div className="sa-input-group">
                <label className="sa-input-label">Compensation Type</label>
                <select
                  className="sa-input"
                  value={compensationType}
                  onChange={(e) => setCompensationType(e.target.value as CompensationType)}
                >
                  <option value="HOURLY">Hourly (₹/hr worked)</option>
                  <option value="MONTHLY">Monthly Salary (Fixed ₹/month)</option>
                  <option value="YEARLY">Yearly Contract (Fixed ₹/year)</option>
                </select>
              </div>

              {compensationType === "HOURLY" && (
                <Input
                  label="Hourly Rate (₹/hr)"
                  type="number"
                  placeholder="300"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              )}
              {compensationType === "MONTHLY" && (
                <Input
                  label="Monthly Salary (₹/month)"
                  type="number"
                  placeholder="25000"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                />
              )}
              {compensationType === "YEARLY" && (
                <Input
                  label="Yearly Salary (₹/year)"
                  type="number"
                  placeholder="300000"
                  value={yearlySalary}
                  onChange={(e) => setYearlySalary(e.target.value)}
                />
              )}
            </div>

            <Input
              label="Joining Date"
              type="date"
              value={joinedDate}
              onChange={(e) => setJoinedDate(e.target.value)}
            />
          </div>
        )}

        {/* 2. License Number & Expiry Date */}
        <div className="sa-form-grid-2">
          <Input
            label="License Number"
            type="text"
            placeholder="e.g. DL-98342-2022"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />

          <Input
            label="License Expiry Date"
            type="date"
            value={licenseExpiryDate}
            onChange={(e) => setLicenseExpiryDate(e.target.value)}
          />
        </div>

        {/* 3. Availability Status & Gmail Invite Option */}
        <div className="sa-form-grid-2">
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

          {!driverToEdit && (
            <div className="sa-input-group" style={{ justifyContent: "center", display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "16px" }}>
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                />
                Send Driver App Login Invite (Gmail/SMS)
              </label>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="sa-form-actions" style={{ marginTop: "16px" }}>
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
