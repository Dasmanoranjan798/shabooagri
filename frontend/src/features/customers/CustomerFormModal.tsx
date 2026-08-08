import React, { useEffect, useState } from "react";
import type { CreateCustomerPayload, Customer } from "../../types/customer";
import type { VillageOption } from "../../types/booking";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

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

  // Grant Farmer Portal Login Access state
  const [grantLogin, setGrantLogin] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("Password123!");

  const [isLoadingVillages, setIsLoadingVillages] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadVillages() {
      setIsLoadingVillages(true);
      try {
        const list = await api.listVillages();
        setVillages(list);
        if (!customerToEdit && list.length > 0 && !villageId) {
          setVillageId(list[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load villages:", err);
      } finally {
        setIsLoadingVillages(false);
      }
    }

    loadVillages();
  }, [isOpen, customerToEdit]);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setVillageId(customerToEdit.villageId);
      setPhone(customerToEdit.phone || "");
      setAddress(customerToEdit.address || "");
      setNotes(customerToEdit.notes || "");
    } else {
      setName("");
      setVillageId("");
      setPhone("");
      setAddress("");
      setNotes("");
      setGrantLogin(false);
      setEmail("");
      setPassword("Password123!");
    }
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Please enter ${customerTerm} name`);
      return;
    }
    if (!villageId) {
      setError(`Please select a ${villageTerm}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let createdUserId: string | undefined = undefined;

      if (!customerToEdit && grantLogin) {
        if (!email.trim() && !phone.trim()) {
          setError(`Email or Mobile Number is required to create a ${customerTerm} portal account`);
          setIsSubmitting(false);
          return;
        }
        const userRes = await api.register({
          fullName: name.trim(),
          email: email.trim() || undefined,
          mobileNumber: phone.trim() || undefined,
          password: password || "Password123!",
          roleKey: "farmer",
        });
        createdUserId = userRes.user.id;
      }

      const payload: CreateCustomerPayload = {
        name: name.trim(),
        villageId,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        userId: createdUserId,
      };

      if (customerToEdit) {
        await api.updateCustomer(customerToEdit.id, payload);
      } else {
        await api.createCustomer(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to save ${customerTerm.toLowerCase()} record`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? `Edit ${customerTerm} ${customerToEdit.name}` : `Register New ${customerTerm}`}
      maxWidth="550px"
    >
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
            <label className="sa-input-label">{villageTerm} *</label>
            <select
              className="sa-input"
              value={villageId}
              onChange={(e) => setVillageId(e.target.value)}
              required
            >
              <option value="">-- Select {villageTerm} --</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
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

        {/* 4. Notes */}
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

        {/* 5. Optional Farmer Portal Login Account */}
        {!customerToEdit && (
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={grantLogin}
                onChange={(e) => setGrantLogin(e.target.checked)}
              />
              🌾 Grant {customerTerm} Portal Login Account
            </label>

            {grantLogin && (
              <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", marginTop: "8px" }}>
                <div className="sa-form-grid-2">
                  <Input
                    label="Email Address (Optional)"
                    type="email"
                    placeholder="e.g. farmer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    label="Initial Password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password123!"
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
            {customerToEdit ? "Save Changes" : `Register ${customerTerm}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
