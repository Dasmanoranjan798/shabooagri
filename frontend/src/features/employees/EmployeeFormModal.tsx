import React, { useEffect, useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import type { CompensationType, CreateEmployeePayload, Employee, EmploymentStatus } from "../../types/employee";
import type { Role } from "../../types/rbac";
import type { CreateInviteResponse } from "../../types/team";
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

 // Send Login Invite state
 const [sendInvite, setSendInvite] = useState<boolean>(false);
 const [email, setEmail] = useState<string>("");
 const [roles, setRoles] = useState<Role[]>([]);
 const [inviteRoleId, setInviteRoleId] = useState<string>("");
 const [inviteResult, setInviteResult] = useState<CreateInviteResponse | null>(null);
 const [linkCopied, setLinkCopied] = useState<boolean>(false);

 const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);

 // Existing employee with no login yet can also be sent an invite —
 // only an employee who already has a User account is excluded.
 const canSendInvite = !employeeToEdit || !employeeToEdit.userId;

 useEffect(() => {
 if (isOpen) {
 api.listRoles().then(setRoles).catch(() => setRoles([]));
 }
 }, [isOpen]);

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
 setSendInvite(false);
 setEmail("");
 setInviteRoleId("");
 setInviteResult(null);
 setLinkCopied(false);
 setError(null);
 }, [employeeToEdit, isOpen]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) {
 setError("Please enter employee name");
 return;
 }

 if (sendInvite) {
 if (!inviteRoleId) {
 setError("Please select an account role for the login invite");
 return;
 }
 if (!email.trim() && !phone.trim()) {
 setError("Email or phone is required to send a login invite");
 return;
 }
 }

 setIsSubmitting(true);
 setError(null);

 try {
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
 };

 const savedEmployee = employeeToEdit
 ? await api.updateEmployee(employeeToEdit.id, payload)
 : await api.createEmployee(payload);

 if (sendInvite) {
 const invite = await api.createInvite({
 fullName: name.trim(),
 roleId: inviteRoleId,
 email: email.trim() || undefined,
 phone: phone.trim() || undefined,
 employeeId: savedEmployee.id,
 });
 setInviteResult(invite);
 onSuccess();
 return;
 }

 onSuccess();
 onClose();
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

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={
 inviteResult
 ? "Invite Sent"
 : employeeToEdit
 ? `Edit Staff Member — ${employeeToEdit.name}`
 : "Register New Staff Member"
 }
 maxWidth="500px"
 >
 {inviteResult ? (
 <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
 {inviteResult.deliveryMethod === "email" ? (
 <div className="sa-alert sa-alert-success" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
 <CheckCircle2 size={16} />
 <span>Invite emailed to {email}. They can click the link to set their password and get started.</span>
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
 <Button type="button" variant="secondary" onClick={onClose} style={{ width: "100%" }}>
 Done
 </Button>
 </div>
 ) : (
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

 {/* 5. Optional Login Invite */}
 {canSendInvite && (
 <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "12px" }}>
 <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
 <input
 type="checkbox"
 checked={sendInvite}
 onChange={(e) => setSendInvite(e.target.checked)}
 />
 Send ShabooAgri Login Invite
 </label>

 {sendInvite && (
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
 value={inviteRoleId}
 onChange={(e) => setInviteRoleId(e.target.value)}
 required={sendInvite}
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
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 />
 </div>
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
 )}
 </Modal>
 );
};
