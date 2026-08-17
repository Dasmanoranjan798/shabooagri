import { useEffect, useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import type { Role } from "../../types/rbac";
import type { VillageOption } from "../../types/booking";
import type { CreateInviteResponse } from "../../types/team";

// Migrated onto the shared task-tray system (Pass 2, Batch 2) — see
// BookingFormModal.tsx for the full explanation of the new contract.
// Always a create-only form (no edit mode), so no initProps are needed.

export type InviteStaffInitProps = Record<string, never>;

export interface InviteStaffDraft {
  fullName: string;
  roleId: string;
  email: string;
  phone: string;
  villageId: string;
}

export function defaultInviteStaffDraft(): InviteStaffDraft {
  return { fullName: "", roleId: "", email: "", phone: "", villageId: "" };
}

export const InviteStaffTask: TaskContentComponent<InviteStaffInitProps> = ({ taskId, onRequestClose }) => {
  const villageTerm = getTerm("village");
  const [draft, setDraft] = useTaskDraft<InviteStaffDraft>(taskId, defaultInviteStaffDraft());

  const [roles, setRoles] = useState<Role[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateInviteResponse | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    api.listRoles().then(setRoles).catch(() => setRoles([]));
    api.listVillages().then(setVillages).catch(() => setVillages([]));
  }, []);

  const selectedRole = roles.find((r) => r.id === draft.roleId);
  const isFarmerRole = selectedRole?.systemKey === "farmer";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!draft.fullName.trim()) {
      setError("Please enter their full name");
      return;
    }
    if (!draft.roleId) {
      setError("Please select a role");
      return;
    }
    if (!draft.email.trim() && !draft.phone.trim()) {
      setError("Please provide an email or phone number");
      return;
    }
    if (isFarmerRole && !draft.villageId) {
      setError(`Please select a ${villageTerm.toLowerCase()} for a farmer invite`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createInvite({
        fullName: draft.fullName.trim(),
        roleId: draft.roleId,
        email: draft.email.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        villageId: isFarmerRole ? draft.villageId : undefined,
      });
      setResult(res);
      notifyDataRefresh("team");
    } catch (err: any) {
      setError(err.message || "Failed to send invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "1.5rem" }}>
        {result.deliveryMethod === "email" ? (
          <div className="sa-alert sa-alert-success" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} />
            <span>Invite emailed to {draft.email}. They can click the link to set their password and get started.</span>
          </div>
        ) : result.deliveryMethod === "sms" ? (
          <div className="sa-alert sa-alert-success" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} />
            <span>SMS invite sent to {draft.phone}. They can click the link to set their password and get started.</span>
          </div>
        ) : (
          <div className="sa-alert sa-alert-info">
            <p style={{ marginBottom: "8px" }}>
              Invite link generated — copy or share it directly with them (WhatsApp, SMS, etc.):
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
              <span style={{ fontSize: "0.78rem", wordBreak: "break-all", flex: 1 }}>{result.inviteLink}</span>
              <button type="button" className="sa-icon-action" onClick={handleCopyLink} title="Copy link">
                {linkCopied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        )}

        {draft.phone && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const msg = encodeURIComponent(`Hi ${draft.fullName}, you have been invited to join ShabooAgri. Click here to activate your account: ${result.inviteLink}`);
              window.open(`https://api.whatsapp.com/send?phone=91${draft.phone.replace(/\D/g, "")}&text=${msg}`, "_blank");
            }}
            style={{ width: "100%" }}
          >
            Share via WhatsApp
          </Button>
        )}

        <Button type="button" variant="primary" onClick={onRequestClose} style={{ width: "100%" }}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "1.5rem" }}>
      {error && <div className="sa-alert sa-alert-danger">{error}</div>}

      <Input
        label="Full Name"
        type="text"
        placeholder="e.g. Ramesh Kumar"
        value={draft.fullName}
        onChange={(e) => setDraft({ fullName: e.target.value })}
        required
        autoFocus
      />

      <div className="sa-input-group">
        <label className="sa-input-label">Role</label>
        <select className="sa-input" value={draft.roleId} onChange={(e) => setDraft({ roleId: e.target.value })} required>
          <option value="">Select a role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Email (optional if phone given)"
        type="email"
        placeholder="name@example.com"
        value={draft.email}
        onChange={(e) => setDraft({ email: e.target.value })}
      />

      <Input
        label="Phone (optional if email given)"
        type="tel"
        placeholder="9876543210"
        value={draft.phone}
        onChange={(e) => setDraft({ phone: e.target.value })}
      />

      {isFarmerRole && (
        <div className="sa-input-group">
          <label className="sa-input-label">{villageTerm}</label>
          <SearchableSelect
            placeholder={`Select a ${villageTerm.toLowerCase()}`}
            value={draft.villageId}
            onChange={(v) => setDraft({ villageId: v })}
            options={villages.map((v) => ({ value: v.id, label: v.name }))}
          />
        </div>
      )}

      <Button type="submit" isLoading={isSubmitting} style={{ width: "100%", marginTop: "4px" }}>
        Send Invite
      </Button>
    </form>
  );
};
