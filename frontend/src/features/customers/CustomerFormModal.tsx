import { useEffect, useState } from "react";
import { Copy, CheckCircle2, Pencil } from "lucide-react";
import type { CreateCustomerPayload, Customer } from "../../types/customer";
import type { VillageOption } from "../../types/booking";
import type { CreateInviteResponse } from "../../types/team";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

// Migrated onto the shared task-tray system (Pass 2, Batch 2) — see
// BookingFormModal.tsx for the full explanation of the new contract.

export interface CustomerFormInitProps {
  customerToEdit: Customer | null;
}

export interface CustomerFormDraft {
  name: string;
  villageId: string;
  phone: string;
  address: string;
  notes: string;
  isGstApplicable: boolean;
  gstin: string;
  isActive: boolean;
  sendInvite: boolean;
  email: string;
  isAddingNewVillage: boolean;
  newVillageName: string;
  isEditingVillage: boolean;
  editVillageName: string;
}

export function defaultCustomerDraft(customerToEdit: Customer | null): CustomerFormDraft {
  const shared = {
    sendInvite: false,
    email: "",
    isAddingNewVillage: false,
    newVillageName: "",
    isEditingVillage: false,
    editVillageName: "",
  };
  if (customerToEdit) {
    return {
      ...shared,
      name: customerToEdit.name,
      villageId: customerToEdit.villageId,
      phone: customerToEdit.phone || "",
      address: customerToEdit.address || "",
      notes: customerToEdit.notes || "",
      isGstApplicable: customerToEdit.isGstApplicable || false,
      gstin: customerToEdit.gstin || "",
      isActive: customerToEdit.isActive ?? true,
    };
  }
  return {
    ...shared,
    name: "",
    villageId: "",
    phone: "",
    address: "",
    notes: "",
    isGstApplicable: false,
    gstin: "",
    isActive: true,
  };
}

export const CustomerFormTask: TaskContentComponent<CustomerFormInitProps> = ({
  taskId,
  initProps,
  onRequestClose,
}) => {
  const { customerToEdit } = initProps;
  const customerTerm = getTerm("customer");
  const villageTerm = getTerm("village");
  const [draft, setDraft] = useTaskDraft<CustomerFormDraft>(taskId, defaultCustomerDraft(customerToEdit));

  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [farmerRoleId, setFarmerRoleId] = useState<string>("");
  const [inviteResult, setInviteResult] = useState<CreateInviteResponse | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  const [isLoadingVillages, setIsLoadingVillages] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingVillage, setIsCreatingVillage] = useState<boolean>(false);
  const [isSavingVillageEdit, setIsSavingVillageEdit] = useState<boolean>(false);

  // Existing customer with no portal login yet can also be invited — only
  // a customer who already has a User account is excluded.
  const canSendInvite = !customerToEdit || !customerToEdit.userId;

  useEffect(() => {
    async function loadVillages() {
      setIsLoadingVillages(true);
      try {
        const list = await api.listVillages();
        setVillages(list);
        if (!customerToEdit && list.length > 0) {
          setDraft((prev) => (prev.villageId ? {} : { villageId: list[0].id }));
        }
      } catch (err: any) {
        console.error("Failed to load villages:", err);
      } finally {
        setIsLoadingVillages(false);
      }
    }
    loadVillages();

    api.listRoles().then((roles) => {
      const farmerRole = roles.find((r) => r.systemKey === "farmer");
      if (farmerRole) setFarmerRoleId(farmerRole.id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateInlineVillage = async () => {
    if (!draft.newVillageName.trim()) {
      setError(`Please enter a name for the new ${villageTerm.toLowerCase()}`);
      return;
    }
    setIsCreatingVillage(true);
    setError(null);
    try {
      const created = await api.createVillage({ name: draft.newVillageName.trim() });
      setVillages((prev) => [...prev, created]);
      setDraft({ villageId: created.id, newVillageName: "", isAddingNewVillage: false });
      notifyDataRefresh("villages");
    } catch (err: any) {
      setError(err.message || `Failed to create new ${villageTerm}`);
    } finally {
      setIsCreatingVillage(false);
    }
  };

  const handleStartEditVillage = () => {
    const current = villages.find((v) => v.id === draft.villageId);
    setDraft({ editVillageName: current?.name || "", isEditingVillage: true });
  };

  const handleSaveVillageEdit = async () => {
    if (!draft.editVillageName.trim()) {
      setError(`Please enter a name for the ${villageTerm.toLowerCase()}`);
      return;
    }
    setIsSavingVillageEdit(true);
    setError(null);
    try {
      const updated = await api.updateVillage(draft.villageId, { name: draft.editVillageName.trim() });
      setVillages((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      setDraft({ isEditingVillage: false });
      notifyDataRefresh("villages");
    } catch (err: any) {
      setError(err.message || `Failed to rename ${villageTerm.toLowerCase()}`);
    } finally {
      setIsSavingVillageEdit(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError(`Please enter ${customerTerm} name`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let activeVillageId = draft.villageId;

    if (draft.isAddingNewVillage && draft.newVillageName.trim()) {
      try {
        const created = await api.createVillage({ name: draft.newVillageName.trim() });
        setVillages((prev) => [...prev, created]);
        activeVillageId = created.id;
        setDraft({ villageId: created.id, newVillageName: "", isAddingNewVillage: false });
        notifyDataRefresh("villages");
      } catch (vErr: any) {
        setError(vErr.message || `Failed to create new ${villageTerm.toLowerCase()}`);
        setIsSubmitting(false);
        return;
      }
    }

    if (!activeVillageId) {
      setError(`Please select or add a ${villageTerm}`);
      setIsSubmitting(false);
      return;
    }

    if (draft.sendInvite && !draft.email.trim() && !draft.phone.trim()) {
      setError(`Email or Mobile Number is required to send a ${customerTerm.toLowerCase()} portal invite`);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreateCustomerPayload = {
        name: draft.name.trim(),
        villageId: activeVillageId,
        phone: draft.phone.trim() || undefined,
        address: draft.address.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        isGstApplicable: draft.isGstApplicable,
        gstin: draft.gstin.trim() || undefined,
        ...(customerToEdit ? { isActive: draft.isActive } : {}),
      };

      const savedCustomer = customerToEdit
        ? await api.updateCustomer(customerToEdit.id, payload)
        : await api.createCustomer(payload);

      notifyDataRefresh("customers");

      if (draft.sendInvite) {
        if (!farmerRoleId) {
          setError(
            `${customerTerm} record saved, but the portal invite could not be sent (couldn't find the Farmer role). Please try again or check Settings > Roles.`
          );
          return;
        }

        try {
          const invite = await api.createInvite({
            fullName: draft.name.trim(),
            roleId: farmerRoleId,
            email: draft.email.trim() || undefined,
            phone: draft.phone.trim() || undefined,
            customerId: savedCustomer.id,
          });
          setInviteResult(invite);
          return;
        } catch (inviteErr: any) {
          setError(
            `${customerTerm} record saved, but the portal invite failed: ${inviteErr.message || "Unknown error"}`
          );
          return;
        }
      }

      onRequestClose();
    } catch (err: any) {
      setError(err.message || `Failed to save ${customerTerm.toLowerCase()} record`);
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
      {isLoadingVillages && <div className="sa-alert sa-alert-info">Loading {villageTerm.toLowerCase()} directory...</div>}

      {/* 1. Customer Name */}
      <Input
        label={`${customerTerm} Name *`}
        type="text"
        placeholder="e.g. Ramesh Kumar"
        value={draft.name}
        onChange={(e) => setDraft({ name: e.target.value })}
        required
        autoFocus
      />

      {/* 2. Village Selection & Phone Number */}
      <div className="sa-form-grid-2">
        <div className="sa-input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <label className="sa-input-label">{villageTerm} *</label>
            {!draft.isAddingNewVillage && (
              <button
                type="button"
                onClick={() => setDraft({ isAddingNewVillage: true })}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                + Add New {villageTerm}
              </button>
            )}
          </div>

          {draft.isAddingNewVillage ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Input
                placeholder={`Enter ${villageTerm.toLowerCase()} name`}
                value={draft.newVillageName}
                onChange={(e) => setDraft({ newVillageName: e.target.value })}
                style={{ flex: 1 }}
                autoFocus
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateInlineVillage}
                isLoading={isCreatingVillage}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDraft({ isAddingNewVillage: false })}
              >
                Cancel
              </Button>
            </div>
          ) : draft.isEditingVillage ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Input
                placeholder={`${villageTerm} name`}
                value={draft.editVillageName}
                onChange={(e) => setDraft({ editVillageName: e.target.value })}
                style={{ flex: 1 }}
                autoFocus
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveVillageEdit}
                isLoading={isSavingVillageEdit}
              >
                Save
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setDraft({ isEditingVillage: false })}>
                Cancel
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <SearchableSelect
                  placeholder={`-- Select ${villageTerm} --`}
                  value={draft.villageId}
                  onChange={(v) => setDraft({ villageId: v })}
                  options={villages.map((v) => ({ value: v.id, label: v.name }))}
                />
              </div>
              {draft.villageId && (
                <button
                  type="button"
                  className="sa-icon-action"
                  title={`Rename this ${villageTerm.toLowerCase()}`}
                  onClick={handleStartEditVillage}
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        <Input
          label="Mobile Phone Number"
          type="tel"
          placeholder="e.g. 9876543210"
          value={draft.phone}
          onChange={(e) => setDraft({ phone: e.target.value })}
        />
      </div>

      {/* 3. Address & Field Location */}
      <div className="sa-input-group">
        <label className="sa-input-label">Address / Field Location</label>
        <textarea
          className="sa-input sa-textarea"
          rows={2}
          value={draft.address}
          onChange={(e) => setDraft({ address: e.target.value })}
          placeholder="Farm address, landmark, or plot details..."
        />
      </div>

      {/* 4. Optional Customer GST Details */}
      <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", marginBottom: "12px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", marginBottom: draft.isGstApplicable ? "8px" : 0 }}>
          <input
            type="checkbox"
            checked={draft.isGstApplicable}
            onChange={(e) => setDraft({ isGstApplicable: e.target.checked })}
          />
          {customerTerm} GST Registered / GST Applicable
        </label>
        {draft.isGstApplicable && (
          <Input
            label={`${customerTerm} GSTIN (Optional)`}
            type="text"
            placeholder="e.g. 21AAAAA0000A1Z5"
            value={draft.gstin}
            onChange={(e) => setDraft({ gstin: e.target.value.toUpperCase() })}
            maxLength={15}
          />
        )}
      </div>

      {/* Active/Inactive — the deactivate alternative to delete, edit-mode only */}
      {customerToEdit && (
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ isActive: e.target.checked })}
            />
            Active ({customerTerm} can be booked/assigned)
          </label>
        </div>
      )}

      {/* 5. Notes */}
      <div className="sa-input-group">
        <label className="sa-input-label">Notes (Optional)</label>
        <textarea
          className="sa-input sa-textarea"
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft({ notes: e.target.value })}
          placeholder="Special billing instructions, preferred equipment..."
        />
      </div>

      {/* 6. Optional Farmer Portal Invite */}
      {canSendInvite && (
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={draft.sendInvite}
              onChange={(e) => setDraft({ sendInvite: e.target.checked })}
            />
            Send {customerTerm} Portal Invite
          </label>

          {draft.sendInvite && (
            <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", marginTop: "8px" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary, #64748b)", marginBottom: "10px" }}>
                They'll get an invite to set their own password — email if provided below, otherwise you'll get a
                link to share with them directly (their phone number above is used if no email is given).
              </p>
              <Input
                label="Email Address (Optional)"
                type="email"
                placeholder="e.g. farmer@example.com"
                value={draft.email}
                onChange={(e) => setDraft({ email: e.target.value })}
              />
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
          {customerToEdit ? "Save Changes" : `Register ${customerTerm}`}
        </Button>
      </div>
    </form>
  );
};
