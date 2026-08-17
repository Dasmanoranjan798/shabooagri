import React, { useState } from "react";
import type { VillageOption } from "../../types/booking";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

// Migrated onto the shared task-tray system alongside BookingFormModal.tsx
// — see that file's header comment for the full explanation of the new
// contract (no more isOpen/onClose, mounted only while visible).

export interface VillageFormInitProps {
  villageToEdit: VillageOption | null;
}

export interface VillageFormDraft {
  name: string;
}

export function defaultVillageDraft(villageToEdit: VillageOption | null): VillageFormDraft {
  return { name: villageToEdit ? villageToEdit.name : "" };
}

export const VillageFormTask: TaskContentComponent<VillageFormInitProps> = ({ taskId, initProps, onRequestClose }) => {
  const { villageToEdit } = initProps;
  const [draft, setDraft] = useTaskDraft<VillageFormDraft>(taskId, defaultVillageDraft(villageToEdit));
  const villageTerm = getTerm("village");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError(`Please enter a ${villageTerm.toLowerCase()} name`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (villageToEdit) {
        await api.updateVillage(villageToEdit.id, { name: draft.name.trim() });
      } else {
        await api.createVillage({ name: draft.name.trim() });
      }
      notifyDataRefresh("villages");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || `Failed to save ${villageTerm.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sa-booking-form" style={{ padding: "1.5rem" }}>
      {error && <div className="sa-alert sa-alert-danger">{error}</div>}
      <Input
        label={`${villageTerm} Name *`}
        type="text"
        value={draft.name}
        onChange={(e) => setDraft({ name: e.target.value })}
        placeholder="e.g. Rampur"
        autoFocus
      />
      <div className="sa-form-actions">
        <Button type="button" variant="secondary" onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {villageToEdit ? "Save Changes" : `Add ${villageTerm}`}
        </Button>
      </div>
    </form>
  );
};
