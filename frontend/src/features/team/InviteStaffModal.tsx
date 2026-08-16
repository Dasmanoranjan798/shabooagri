import React, { useEffect, useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import type { Role } from "../../types/rbac";
import type { VillageOption } from "../../types/booking";
import type { CreateInviteResponse } from "../../types/team";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);

  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [villageId, setVillageId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateInviteResponse | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFullName("");
    setRoleId("");
    setEmail("");
    setPhone("");
    setVillageId("");
    setError(null);
    setResult(null);
    setLinkCopied(false);
    api.listRoles().then(setRoles);
    api.listVillages().then(setVillages);
  }, [isOpen]);

  const selectedRole = roles.find((r) => r.id === roleId);
  const isFarmerRole = selectedRole?.systemKey === "farmer";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter their full name");
      return;
    }
    if (!roleId) {
      setError("Please select a role");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Please provide an email or phone number");
      return;
    }
    if (isFarmerRole && !villageId) {
      setError("Please select a village for a farmer invite");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createInvite({
        fullName: fullName.trim(),
        roleId,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        villageId: isFarmerRole ? villageId : undefined,
      });
      setResult(res);
      onSuccess();
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={result ? "Invite Sent" : "Invite Staff Member"}>
      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {result.deliveryMethod === "email" ? (
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
                <span style={{ fontSize: "0.78rem", wordBreak: "break-all", flex: 1 }}>{result.inviteLink}</span>
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
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {error && <div className="sa-alert sa-alert-danger">{error}</div>}

          <Input
            label="Full Name"
            type="text"
            placeholder="e.g. Ramesh Kumar"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />

          <div className="sa-input-group">
            <label className="sa-input-label">Role</label>
            <select className="sa-input" value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Phone (optional if email given)"
            type="tel"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {isFarmerRole && (
            <div className="sa-input-group">
              <label className="sa-input-label">Village</label>
              <select className="sa-input" value={villageId} onChange={(e) => setVillageId(e.target.value)} required>
                <option value="">Select a village</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} style={{ width: "100%", marginTop: "4px" }}>
            Send Invite
          </Button>
        </form>
      )}
    </Modal>
  );
};
