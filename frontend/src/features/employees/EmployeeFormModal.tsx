import { useEffect, useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import type { CompensationType, CreateEmployeePayload, Employee, EmploymentStatus } from "../../types/employee";
import type { Role } from "../../types/rbac";
import type { CreateInviteResponse } from "../../types/team";
import { api } from "../../lib/api";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

// Migrated onto the shared task-tray system (Pass 2, Batch 2) — see
// BookingFormModal.tsx for the full explanation of the new contract.

export interface EmployeeFormInitProps {
  employeeToEdit: Employee | null;
}

export interface EmployeeFormDraft {
  name: string;
  roleTitle: string;
  phone: string;
  employmentStatus: EmploymentStatus;
  compensationType: CompensationType;
  hourlyRate: string;
  monthlySalary: string;
  yearlySalary: string;
  joinedDate: string;
  sendInvite: boolean;
  email: string;
  inviteRoleId: string;
}

export function defaultEmployeeDraft(employeeToEdit: Employee | null): EmployeeFormDraft {
  const shared = { sendInvite: false, email: "", inviteRoleId: "" };
  if (employeeToEdit) {
    return {
      ...shared,
      name: employeeToEdit.name,
      roleTitle: employeeToEdit.roleTitle || "",
      phone: employeeToEdit.phone || "",
      employmentStatus: employeeToEdit.employmentStatus || "ACTIVE",
      compensationType: employeeToEdit.compensationType || "HOURLY",
      hourlyRate: employeeToEdit.hourlyRate ? String(employeeToEdit.hourlyRate) : "",
      monthlySalary: employeeToEdit.monthlySalary ? String(employeeToEdit.monthlySalary) : "",
      yearlySalary: employeeToEdit.yearlySalary ? String(employeeToEdit.yearlySalary) : "",
      joinedDate: employeeToEdit.joinedDate ? employeeToEdit.joinedDate.slice(0, 10) : "",
    };
  }
  return {
    ...shared,
    name: "",
    roleTitle: "",
    phone: "",
    employmentStatus: "ACTIVE",
    compensationType: "HOURLY",
    hourlyRate: "",
    monthlySalary: "",
    yearlySalary: "",
    joinedDate: "",
  };
}

export const EmployeeFormTask: TaskContentComponent<EmployeeFormInitProps> = ({
  taskId,
  initProps,
  onRequestClose,
}) => {
  const { employeeToEdit } = initProps;
  const [draft, setDraft] = useTaskDraft<EmployeeFormDraft>(taskId, defaultEmployeeDraft(employeeToEdit));

  const [roles, setRoles] = useState<Role[]>([]);
  const [inviteResult, setInviteResult] = useState<CreateInviteResponse | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Existing employee with no login yet can also be sent an invite —
  // only an employee who already has a User account is excluded.
  const canSendInvite = !employeeToEdit || !employeeToEdit.userId;

  useEffect(() => {
    api.listRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("Please enter employee name");
      return;
    }

    if (draft.sendInvite) {
      if (!draft.inviteRoleId) {
        setError("Please select an account role for the login invite");
        return;
      }
      if (!draft.email.trim() && !draft.phone.trim()) {
        setError("Email or phone is required to send a login invite");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateEmployeePayload = {
        name: draft.name.trim(),
        roleTitle: draft.roleTitle.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        employmentStatus: draft.employmentStatus,
        compensationType: draft.compensationType,
        hourlyRate: draft.hourlyRate ? Number(draft.hourlyRate) : undefined,
        monthlySalary: draft.monthlySalary ? Number(draft.monthlySalary) : undefined,
        yearlySalary: draft.yearlySalary ? Number(draft.yearlySalary) : undefined,
        joinedDate: draft.joinedDate || undefined,
      };

      const savedEmployee = employeeToEdit
        ? await api.updateEmployee(employeeToEdit.id, payload)
        : await api.createEmployee(payload);

      notifyDataRefresh("employees");

      if (draft.sendInvite) {
        const invite = await api.createInvite({
          fullName: draft.name.trim(),
          roleId: draft.inviteRoleId,
          email: draft.email.trim() || undefined,
          phone: draft.phone.trim() || undefined,
          employeeId: savedEmployee.id,
        });
        setInviteResult(invite);
        return;
      }

      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to save employee record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteResult) return;
    await navigator.clipboard.writeText(inviteResult.inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (inviteResult) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "1.5rem" }}>
        {inviteResult.deliveryMethod === "email" ? (
          <div className="sa-alert sa-alert-success" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} />
            <span>Invite emailed to {draft.email}. They can click the link to set their password and get started.</span>
          </div>
        ) : (
          <div className="sa-alert sa-alert-info">
            <p style={{ marginBottom: "8px" }}>
              SMS delivery isn't connected yet — copy this link and share it with them directly (WhatsApp, SMS,
              etc.).
            </p>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                background: "var(--color-surface-alt, #f1f5f9)",
                borderRadius: "8px",
                padding: "8px 10px",
              }}
            >
              <span style={{ fontSize: "0.78rem", wordBreak: "break-all", flex: 1 }}>{inviteResult.inviteLink}</span>
              <button type="button" className="sa-icon-action" onClick={handleCopyLink} title="Copy link">
                {linkCopied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        )}
        <Button type="button" variant="secondary" onClick={onRequestClose} style={{ width: "100%" }}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sa-booking-form" style={{ padding: "1.5rem" }}>
      {error && <div className="sa-alert sa-alert-danger">{error}</div>}

      {/* 1. Full Name */}
      <Input
        label="Full Name *"
        type="text"
        placeholder="e.g. Suresh Patel"
        value={draft.name}
        onChange={(e) => setDraft({ name: e.target.value })}
        required
        autoFocus
      />

      {/* 2. Role Title / Designation & Phone */}
      <div className="sa-form-grid-2">
        <Input
          label="Designation / Role Title"
          type="text"
          placeholder="e.g. Fleet Manager, Mechanic"
          value={draft.roleTitle}
          onChange={(e) => setDraft({ roleTitle: e.target.value })}
        />

        <Input
          label="Mobile Phone Number"
          type="tel"
          placeholder="e.g. 9876543210"
          value={draft.phone}
          onChange={(e) => setDraft({ phone: e.target.value })}
        />
      </div>

      {/* 3. Employment Status & Joined Date */}
      <div className="sa-form-grid-2">
        <div className="sa-input-group">
          <label className="sa-input-label">Employment Status</label>
          <select
            className="sa-input"
            value={draft.employmentStatus}
            onChange={(e) => setDraft({ employmentStatus: e.target.value as EmploymentStatus })}
          >
            <option value="ACTIVE">Active Staff</option>
            <option value="INACTIVE">Inactive / Resigned</option>
          </select>
        </div>

        <Input
          label="Joined Date"
          type="date"
          value={draft.joinedDate}
          onChange={(e) => setDraft({ joinedDate: e.target.value })}
        />
      </div>

      {/* 4. Compensation Model */}
      <div className="sa-form-grid-2" style={{ background: "var(--color-surface-secondary)", padding: "10px", borderRadius: "6px" }}>
        <div className="sa-input-group">
          <label className="sa-input-label">Compensation Type</label>
          <select
            className="sa-input"
            value={draft.compensationType}
            onChange={(e) => setDraft({ compensationType: e.target.value as CompensationType })}
          >
            <option value="HOURLY">Hourly Wage (₹/hr × Job Hours)</option>
            <option value="MONTHLY">Monthly Salary (Fixed ₹/month)</option>
            <option value="YEARLY">Yearly Salary (Fixed ₹/year)</option>
          </select>
        </div>

        {draft.compensationType === "HOURLY" && (
          <Input
            label="Hourly Rate (₹/hr)"
            type="number"
            placeholder="e.g. 200"
            value={draft.hourlyRate}
            onChange={(e) => setDraft({ hourlyRate: e.target.value })}
          />
        )}

        {draft.compensationType === "MONTHLY" && (
          <Input
            label="Monthly Salary (₹/month)"
            type="number"
            placeholder="e.g. 25000"
            value={draft.monthlySalary}
            onChange={(e) => setDraft({ monthlySalary: e.target.value })}
          />
        )}

        {draft.compensationType === "YEARLY" && (
          <Input
            label="Yearly Salary (₹/year)"
            type="number"
            placeholder="e.g. 300000"
            value={draft.yearlySalary}
            onChange={(e) => setDraft({ yearlySalary: e.target.value })}
          />
        )}
      </div>

      {/* 5. Optional Login Invite */}
      {canSendInvite && (
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={draft.sendInvite}
              onChange={(e) => setDraft({ sendInvite: e.target.checked })}
            />
            Send ShabooAgri Login Invite
          </label>

          {draft.sendInvite && (
            <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", marginTop: "8px" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary, #64748b)", marginBottom: "10px" }}>
                They'll get an invite to set their own password — email if provided below, otherwise you'll get a
                link to share with them directly (their phone number above is used if no email is given).
              </p>
              <div className="sa-form-grid-2">
                <div className="sa-input-group">
                  <label className="sa-input-label">Account Role *</label>
                  <select
                    className="sa-input"
                    value={draft.inviteRoleId}
                    onChange={(e) => setDraft({ inviteRoleId: e.target.value })}
                    required={draft.sendInvite}
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Email Address (Optional)"
                  type="email"
                  placeholder="e.g. staff@shabooagri.com"
                  value={draft.email}
                  onChange={(e) => setDraft({ email: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="sa-form-actions">
        <Button type="button" variant="secondary" onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {employeeToEdit ? "Save Changes" : "Register Staff Member"}
        </Button>
      </div>
    </form>
  );
};
