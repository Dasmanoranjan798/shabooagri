import React, { useEffect, useState } from "react";
import { Copy, CheckCircle2, Pencil } from "lucide-react";
import type { CreateCustomerPayload, Customer } from "../../types/customer";
import type { VillageOption } from "../../types/booking";
import type { CreateInviteResponse } from "../../types/team";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

interface CustomerFormModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
 customerToEdit?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
 isOpen,
 onClose,
 onSuccess,
 customerToEdit,
}) => {
 const customerTerm = getTerm("customer");
 const villageTerm = getTerm("village");

 const [villages, setVillages] = useState<VillageOption[]>([]);
 const [name, setName] = useState<string>("");
 const [villageId, setVillageId] = useState<string>("");
 const [phone, setPhone] = useState<string>("");
 const [address, setAddress] = useState<string>("");
 const [notes, setNotes] = useState<string>("");

 // Send Farmer Portal Invite state
 const [sendInvite, setSendInvite] = useState<boolean>(false);
 const [email, setEmail] = useState<string>("");
 const [farmerRoleId, setFarmerRoleId] = useState<string>("");
 const [inviteResult, setInviteResult] = useState<CreateInviteResponse | null>(null);
 const [linkCopied, setLinkCopied] = useState<boolean>(false);

 const [isLoadingVillages, setIsLoadingVillages] = useState<boolean>(false);
 const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);

 // Inline New Village Creation state
 const [isAddingNewVillage, setIsAddingNewVillage] = useState<boolean>(false);
 const [newVillageName, setNewVillageName] = useState<string>("");
 const [isCreatingVillage, setIsCreatingVillage] = useState<boolean>(false);

 const handleCreateInlineVillage = async () => {
   if (!newVillageName.trim()) {
     setError(`Please enter a name for the new ${villageTerm.toLowerCase()}`);
     return;
   }
   setIsCreatingVillage(true);
   setError(null);
   try {
     const created = await api.createVillage({ name: newVillageName.trim() });
     setVillages((prev) => [...prev, created]);
     setVillageId(created.id);
     setNewVillageName("");
     setIsAddingNewVillage(false);
   } catch (err: any) {
     setError(err.message || `Failed to create new ${villageTerm}`);
   } finally {
     setIsCreatingVillage(false);
   }
 };

 // Rename inline state — fixes a mis-typed village name without needing a
 // dedicated Villages management screen (none exists; villages are only
 // ever created inline from here and the Booking form).
 const [isEditingVillage, setIsEditingVillage] = useState<boolean>(false);
 const [editVillageName, setEditVillageName] = useState<string>("");
 const [isSavingVillageEdit, setIsSavingVillageEdit] = useState<boolean>(false);

 const handleStartEditVillage = () => {
   const current = villages.find((v) => v.id === villageId);
   setEditVillageName(current?.name || "");
   setIsEditingVillage(true);
 };

 const handleSaveVillageEdit = async () => {
   if (!editVillageName.trim()) {
     setError(`Please enter a name for the ${villageTerm.toLowerCase()}`);
     return;
   }
   setIsSavingVillageEdit(true);
   setError(null);
   try {
     const updated = await api.updateVillage(villageId, { name: editVillageName.trim() });
     setVillages((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
     setIsEditingVillage(false);
   } catch (err: any) {
     setError(err.message || `Failed to rename ${villageTerm.toLowerCase()}`);
   } finally {
     setIsSavingVillageEdit(false);
   }
 };

 // Existing customer with no portal login yet can also be invited — only
 // a customer who already has a User account is excluded.
 const canSendInvite = !customerToEdit || !customerToEdit.userId;

 useEffect(() => {
    if (!isOpen) return;

    async function loadVillages() {
      setIsLoadingVillages(true);
      try {
        const list = await api.listVillages();
        setVillages(list);
        if (!customerToEdit && list.length > 0) {
          setVillageId((current) => current || list[0].id);
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
  }, [isOpen, customerToEdit]);

  const [isGstApplicable, setIsGstApplicable] = useState<boolean>(false);
  const [gstin, setGstin] = useState<string>("");
  // The Manager-facing alternative to delete (§ dependency-locked
  // deletion, Rule 5) — only meaningful for an existing customer, so it's
  // not part of the create payload at all (defaults true server-side).
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setVillageId(customerToEdit.villageId);
      setPhone(customerToEdit.phone || "");
      setAddress(customerToEdit.address || "");
      setNotes(customerToEdit.notes || "");
      setIsGstApplicable(customerToEdit.isGstApplicable || false);
      setGstin(customerToEdit.gstin || "");
      setIsActive(customerToEdit.isActive ?? true);
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
      setIsGstApplicable(false);
      setGstin("");
      setIsActive(true);
      setIsAddingNewVillage(false);
      setNewVillageName("");
    }
    setSendInvite(false);
    setEmail("");
    setInviteResult(null);
    setLinkCopied(false);
    setError(null);
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Please enter ${customerTerm} name`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let activeVillageId = villageId;

    // Auto-create new village if inline village creation is active with a village name typed
    if (isAddingNewVillage && newVillageName.trim()) {
      try {
        const created = await api.createVillage({ name: newVillageName.trim() });
        setVillages((prev) => [...prev, created]);
        activeVillageId = created.id;
        setVillageId(created.id);
        setNewVillageName("");
        setIsAddingNewVillage(false);
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

    if (sendInvite && !email.trim() && !phone.trim()) {
      setError(`Email or Mobile Number is required to send a ${customerTerm.toLowerCase()} portal invite`);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreateCustomerPayload = {
        name: name.trim(),
        villageId: activeVillageId,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        isGstApplicable,
        gstin: gstin.trim() || undefined,
        ...(customerToEdit ? { isActive } : {}),
      };

      const savedCustomer = customerToEdit
        ? await api.updateCustomer(customerToEdit.id, payload)
        : await api.createCustomer(payload);

      if (sendInvite) {
        if (!farmerRoleId) {
          onSuccess();
          setError(
            `${customerTerm} record saved, but the portal invite could not be sent (couldn't find the Farmer role). Please try again or check Settings > Roles.`
          );
          return;
        }

        try {
          const invite = await api.createInvite({
            fullName: name.trim(),
            roleId: farmerRoleId,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            customerId: savedCustomer.id,
          });
          setInviteResult(invite);
          onSuccess();
          return;
        } catch (inviteErr: any) {
          onSuccess();
          setError(
            `${customerTerm} record saved, but the portal invite failed: ${inviteErr.message || "Unknown error"}`
          );
          return;
        }
      }

      onSuccess();
      onClose();
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

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={
 inviteResult
 ? "Invite Sent"
 : customerToEdit
 ? `Edit ${customerTerm} ${customerToEdit.name}`
 : `Register New ${customerTerm}`
 }
 maxWidth="550px"
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
 {isLoadingVillages && <div className="sa-alert sa-alert-info">Loading {villageTerm.toLowerCase()} directory...</div>}

 {/* 1. Customer Name */}
 <Input
 label={`${customerTerm} Name *`}
 type="text"
 placeholder="e.g. Ramesh Kumar"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 autoFocus
 />

  {/* 2. Village Selection & Phone Number */}
  <div className="sa-form-grid-2">
    <div className="sa-input-group">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <label className="sa-input-label">{villageTerm} *</label>
        {!isAddingNewVillage && (
          <button
            type="button"
            onClick={() => setIsAddingNewVillage(true)}
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

      {isAddingNewVillage ? (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Input
            placeholder={`Enter ${villageTerm.toLowerCase()} name`}
            value={newVillageName}
            onChange={(e) => setNewVillageName(e.target.value)}
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
            onClick={() => setIsAddingNewVillage(false)}
          >
            Cancel
          </Button>
        </div>
      ) : isEditingVillage ? (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Input
            placeholder={`${villageTerm} name`}
            value={editVillageName}
            onChange={(e) => setEditVillageName(e.target.value)}
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
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditingVillage(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <SearchableSelect
              placeholder={`-- Select ${villageTerm} --`}
              value={villageId}
              onChange={setVillageId}
              options={villages.map((v) => ({ value: v.id, label: v.name }))}
            />
          </div>
          {villageId && (
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
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
    />
  </div>

 {/* 3. Address & Field Location */}
 <div className="sa-input-group">
 <label className="sa-input-label">Address / Field Location</label>
 <textarea
 className="sa-input sa-textarea"
 rows={2}
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 placeholder="Farm address, landmark, or plot details..."
 />
 </div>

  {/* 4. Optional Customer GST Details */}
  <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", marginBottom: "12px" }}>
    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", marginBottom: isGstApplicable ? "8px" : 0 }}>
      <input
        type="checkbox"
        checked={isGstApplicable}
        onChange={(e) => setIsGstApplicable(e.target.checked)}
      />
      {customerTerm} GST Registered / GST Applicable
    </label>
    {isGstApplicable && (
      <Input
        label={`${customerTerm} GSTIN (Optional)`}
        type="text"
        placeholder="e.g. 21AAAAA0000A1Z5"
        value={gstin}
        onChange={(e) => setGstin(e.target.value.toUpperCase())}
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
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
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
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Special billing instructions, preferred equipment..."
 />
 </div>

 {/* 6. Optional Farmer Portal Invite */}
 {canSendInvite && (
 <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "12px" }}>
 <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
 <input
 type="checkbox"
 checked={sendInvite}
 onChange={(e) => setSendInvite(e.target.checked)}
 />
 Send {customerTerm} Portal Invite
 </label>

 {sendInvite && (
 <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", marginTop: "8px" }}>
 <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary, #64748b)", marginBottom: "10px" }}>
 They'll get an invite to set their own password — email if provided below, otherwise you'll get a
 link to share with them directly (their phone number above is used if no email is given).
 </p>
 <Input
 label="Email Address (Optional)"
 type="email"
 placeholder="e.g. farmer@example.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
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
 {customerToEdit ? "Save Changes" : `Register ${customerTerm}`}
 </Button>
 </div>
 </form>
 )}
 </Modal>
 );
};
