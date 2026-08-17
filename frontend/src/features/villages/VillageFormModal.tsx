import React, { useEffect, useState } from "react";
import type { VillageOption } from "../../types/booking";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface VillageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  villageToEdit: VillageOption | null;
}

export const VillageFormModal: React.FC<VillageFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  villageToEdit,
}) => {
  const villageTerm = getTerm("village");

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(villageToEdit ? villageToEdit.name : "");
    setError(null);
  }, [villageToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Please enter a ${villageTerm.toLowerCase()} name`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (villageToEdit) {
        await api.updateVillage(villageToEdit.id, { name: name.trim() });
      } else {
        await api.createVillage({ name: name.trim() });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to save ${villageTerm.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={villageToEdit ? `Rename ${villageTerm}` : `Add ${villageTerm}`}
      maxWidth="420px"
    >
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}
        <Input
          label={`${villageTerm} Name *`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rampur"
          autoFocus
        />
        <div className="sa-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {villageToEdit ? "Save Changes" : `Add ${villageTerm}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
