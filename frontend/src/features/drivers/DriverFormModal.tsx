import { useEffect, useState } from "react";
import type {
  AvailabilityStatus,
  CreateDriverPayload,
  Driver,
  EmployeeOption,
} from "../../types/driver";
import type { CompensationType } from "../../types/employee";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

// Migrated onto the shared task-tray system (Pass 2, Batch 1) — see
// BookingFormModal.tsx for the full explanation of the new contract.

export interface DriverFormInitProps {
  driverToEdit: Driver | null;
}

export interface DriverFormDraft {
  employeeId: string;
  isCreatingNewEmployee: boolean;
  name: string;
  email: string;
  phone: string;
  roleTitle: string;
  compensationType: CompensationType;
  hourlyRate: string;
  monthlySalary: string;
  yearlySalary: string;
  joinedDate: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  availabilityStatus: AvailabilityStatus;
  sendInvite: boolean;
}

export function defaultDriverDraft(driverToEdit: Driver | null): DriverFormDraft {
  if (driverToEdit) {
    return {
      employeeId: driverToEdit.employeeId,
      isCreatingNewEmployee: false,
      name: "",
      email: "",
      phone: "",
      roleTitle: "Tractor Driver",
      compensationType: "HOURLY",
      hourlyRate: "300",
      monthlySalary: "25000",
      yearlySalary: "300000",
      joinedDate: new Date().toISOString().slice(0, 10),
      licenseNumber: driverToEdit.licenseNumber || "",
      licenseExpiryDate: driverToEdit.licenseExpiryDate ? driverToEdit.licenseExpiryDate.slice(0, 10) : "",
      availabilityStatus: driverToEdit.availabilityStatus || "AVAILABLE",
      sendInvite: false,
    };
  }
  return {
    employeeId: "",
    isCreatingNewEmployee: true,
    name: "",
    email: "",
    phone: "",
    roleTitle: "Tractor Driver",
    compensationType: "HOURLY",
    hourlyRate: "300",
    monthlySalary: "25000",
    yearlySalary: "300000",
    joinedDate: new Date().toISOString().slice(0, 10),
    licenseNumber: "",
    licenseExpiryDate: "",
    availabilityStatus: "AVAILABLE",
    sendInvite: false,
  };
}

export const DriverFormTask: TaskContentComponent<DriverFormInitProps> = ({
  taskId,
  initProps,
  onRequestClose,
}) => {
  const { driverToEdit } = initProps;
  const driverTerm = getTerm("driver");
  const [draft, setDraft] = useTaskDraft<DriverFormDraft>(taskId, defaultDriverDraft(driverToEdit));

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [driverRoleId, setDriverRoleId] = useState<string>("");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      setIsLoadingEmployees(true);
      try {
        const [list, roles] = await Promise.all([
          api.listEmployees(),
          api.listRoles().catch(() => []),
        ]);
        if (cancelled) return;
        const active = list.filter((e) => e.employmentStatus === "ACTIVE");
        setEmployees(active);
        if (!driverToEdit && active.length > 0 && !draft.employeeId) {
          setDraft({ employeeId: active[0].id });
        }
        const driverRole = roles.find((r) => r.systemKey === "driver");
        if (driverRole) setDriverRoleId(driverRole.id);
      } catch (err: any) {
        console.error("Failed to load employee options:", err);
      } finally {
        if (!cancelled) setIsLoadingEmployees(false);
      }
    }
    loadInitialData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (driverToEdit) {
        await api.updateDriver(driverToEdit.id, {
          licenseNumber: draft.licenseNumber.trim() || undefined,
          licenseExpiryDate: draft.licenseExpiryDate || undefined,
          availabilityStatus: draft.availabilityStatus,
        });
      } else {
        let targetEmployeeId = draft.employeeId;

        if (draft.isCreatingNewEmployee) {
          if (!draft.name.trim()) {
            setError(`Please enter ${driverTerm.toLowerCase()} full name`);
            setIsSubmitting(false);
            return;
          }

          const newEmployee = await api.createEmployee({
            name: draft.name.trim(),
            phone: draft.phone.trim() || undefined,
            roleTitle: draft.roleTitle.trim() || driverTerm,
            compensationType: draft.compensationType,
            hourlyRate: draft.compensationType === "HOURLY" ? parseFloat(draft.hourlyRate) || 0 : undefined,
            monthlySalary: draft.compensationType === "MONTHLY" ? parseFloat(draft.monthlySalary) || 0 : undefined,
            yearlySalary: draft.compensationType === "YEARLY" ? parseFloat(draft.yearlySalary) || 0 : undefined,
            joinedDate: draft.joinedDate || undefined,
          });

          targetEmployeeId = newEmployee.id;
        } else if (!targetEmployeeId) {
          setError("Please select an employee or create a new driver profile");
          setIsSubmitting(false);
          return;
        }

        const payload: CreateDriverPayload = {
          employeeId: targetEmployeeId,
          licenseNumber: draft.licenseNumber.trim() || undefined,
          licenseExpiryDate: draft.licenseExpiryDate || undefined,
          availabilityStatus: draft.availabilityStatus,
        };
        await api.createDriver(payload);

        if (draft.sendInvite && driverRoleId && (draft.email.trim() || draft.phone.trim())) {
          try {
            const targetName = draft.isCreatingNewEmployee
              ? draft.name.trim()
              : employees.find((e) => e.id === targetEmployeeId)?.name || driverTerm;
            await api.createInvite({
              fullName: targetName,
              email: draft.email.trim() || undefined,
              phone: draft.phone.trim() || undefined,
              roleId: driverRoleId,
            });
          } catch (inviteErr: any) {
            console.warn("Failed to dispatch driver app invite:", inviteErr);
          }
        }
      }

      notifyDataRefresh("drivers");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || `Failed to save ${driverTerm.toLowerCase()} profile`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sa-booking-form" style={{ padding: "1.5rem" }}>
      {error && <div className="sa-alert sa-alert-danger">{error}</div>}
      {isLoadingEmployees && <div className="sa-alert sa-alert-info">Loading staff records...</div>}

      {/* Mode Selector Link (Only on Creation) */}
      {!driverToEdit && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--color-border-light)", paddingBottom: "8px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text)" }}>
            {draft.isCreatingNewEmployee ? `${driverTerm} Information` : "Select Existing Staff Member"}
          </span>
          <button
            type="button"
            className="sa-link-action"
            onClick={() => setDraft({ isCreatingNewEmployee: !draft.isCreatingNewEmployee })}
            style={{ fontSize: "0.8rem", fontWeight: 600 }}
          >
            {draft.isCreatingNewEmployee ? "Link to existing employee record instead →" : "← Create new driver profile"}
          </button>
        </div>
      )}

      {/* Mode A: Select Existing Employee */}
      {!driverToEdit && !draft.isCreatingNewEmployee && (
        <div className="sa-input-group" style={{ marginBottom: "16px" }}>
          <label className="sa-input-label">Select Employee *</label>
          <SearchableSelect
            placeholder="-- Select Employee --"
            value={draft.employeeId}
            onChange={(v) => setDraft({ employeeId: v })}
            options={employees.map((emp) => ({
              value: emp.id,
              label: `${emp.name}${emp.roleTitle ? ` (${emp.roleTitle})` : ""}`,
            }))}
          />
        </div>
      )}

      {/* Mode B: Direct All-in-One New Driver Fields */}
      {!driverToEdit && draft.isCreatingNewEmployee && (
        <>
          {/* Name & Mobile */}
          <div className="sa-form-grid-2">
            <Input
              label={`${driverTerm} Full Name *`}
              type="text"
              placeholder="e.g. Ramesh Singh"
              value={draft.name}
              onChange={(e) => setDraft({ name: e.target.value })}
              required
              autoFocus
            />
            <Input
              label="Mobile Phone Number"
              type="tel"
              placeholder="e.g. 9876543210"
              value={draft.phone}
              onChange={(e) => setDraft({ phone: e.target.value })}
            />
          </div>

          {/* Email & Designation */}
          <div className="sa-form-grid-2">
            <Input
              label="Gmail / Email Address"
              type="email"
              placeholder="e.g. ramesh.singh@gmail.com"
              value={draft.email}
              onChange={(e) => setDraft({ email: e.target.value })}
            />
            <Input
              label="Designation / Role Title"
              type="text"
              placeholder="e.g. Tractor Driver, Harvester Operator"
              value={draft.roleTitle}
              onChange={(e) => setDraft({ roleTitle: e.target.value })}
            />
          </div>

          {/* Compensation & Pay Rate */}
          <div className="sa-form-grid-2">
            <div className="sa-input-group">
              <label className="sa-input-label">Compensation Model</label>
              <select
                className="sa-input"
                value={draft.compensationType}
                onChange={(e) => setDraft({ compensationType: e.target.value as CompensationType })}
              >
                <option value="HOURLY">Hourly Pay (₹/hr worked)</option>
                <option value="MONTHLY">Monthly Salary (Fixed ₹/month)</option>
                <option value="YEARLY">Yearly Salary (Fixed ₹/year)</option>
              </select>
            </div>

            {draft.compensationType === "HOURLY" && (
              <Input
                label="Hourly Rate (₹/hr)"
                type="number"
                placeholder="300"
                value={draft.hourlyRate}
                onChange={(e) => setDraft({ hourlyRate: e.target.value })}
              />
            )}
            {draft.compensationType === "MONTHLY" && (
              <Input
                label="Monthly Salary (₹/month)"
                type="number"
                placeholder="25000"
                value={draft.monthlySalary}
                onChange={(e) => setDraft({ monthlySalary: e.target.value })}
              />
            )}
            {draft.compensationType === "YEARLY" && (
              <Input
                label="Yearly Salary (₹/year)"
                type="number"
                placeholder="300000"
                value={draft.yearlySalary}
                onChange={(e) => setDraft({ yearlySalary: e.target.value })}
              />
            )}
          </div>
        </>
      )}

      {/* Driving License & Expiry */}
      <div className="sa-form-grid-2">
        <Input
          label="Driving License Number"
          type="text"
          placeholder="e.g. DL-98342-2022"
          value={draft.licenseNumber}
          onChange={(e) => setDraft({ licenseNumber: e.target.value })}
        />

        <Input
          label="License Expiry Date"
          type="date"
          value={draft.licenseExpiryDate}
          onChange={(e) => setDraft({ licenseExpiryDate: e.target.value })}
        />
      </div>

      {/* Status, Joining Date & Invite */}
      <div className="sa-form-grid-2">
        <div className="sa-input-group">
          <label className="sa-input-label">Availability Status</label>
          <select
            className="sa-input"
            value={draft.availabilityStatus}
            onChange={(e) => setDraft({ availabilityStatus: e.target.value as AvailabilityStatus })}
          >
            <option value="AVAILABLE">Available</option>
            <option value="ON_JOB">On Job (Assigned)</option>
            <option value="OFF_DUTY">Off Duty / Leave</option>
          </select>
        </div>

        {!driverToEdit && draft.isCreatingNewEmployee ? (
          <Input
            label="Joining Date"
            type="date"
            value={draft.joinedDate}
            onChange={(e) => setDraft({ joinedDate: e.target.value })}
          />
        ) : null}
      </div>

      {!driverToEdit && (
        <div style={{ marginTop: "8px", padding: "10px", background: "var(--color-bg)", borderRadius: "6px", border: "1px solid var(--color-border-light)" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={draft.sendInvite}
              onChange={(e) => setDraft({ sendInvite: e.target.checked })}
            />
            Send Driver App Login Invite via Gmail / Email / SMS
          </label>
        </div>
      )}

      {/* Form Actions */}
      <div className="sa-form-actions" style={{ marginTop: "16px" }}>
        <Button type="button" variant="secondary" onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {driverToEdit ? "Save Profile" : `Create ${driverTerm}`}
        </Button>
      </div>
    </form>
  );
};
