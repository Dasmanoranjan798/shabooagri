import React, { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type {
  Booking,
  CreateBookingPayload,
  CustomerOption,
  DriverOption,
  MachineOption,
  VillageOption,
} from "../../types/booking";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

// ---------------------------------------------------------------------------
// Migrated onto the shared task-tray system (§ full-screen mobile forms +
// desktop window management) — Pass 1 proof-of-concept, alongside
// VillageFormModal.tsx. No longer wraps <Modal> or takes isOpen/onClose:
// TaskSheetHost mounts this component only while its task is visible
// (minimizing unmounts it; its field values live in the task's draft, not
// local state, so nothing is lost), and BookingsPage opens it via
// taskTray.open() instead of local isFormModalOpen state.
// ---------------------------------------------------------------------------

export interface BookingFormInitProps {
  bookingToEdit: Booking | null;
}

export interface BookingFormDraft {
  customerId: string;
  villageId: string;
  machineId: string;
  driverId: string;
  scheduledDate: string;
  scheduledTime: string;
  workDescription: string;
  notes: string;
  // Inline quick-create/rename sub-forms — genuine typed-but-unsaved user
  // input, so they're part of the draft too, not just the "real" fields.
  isCreatingFarmer: boolean;
  newFarmerName: string;
  newFarmerPhone: string;
  isCreatingVillage: boolean;
  newVillageName: string;
  isEditingVillage: boolean;
  editVillageName: string;
}

// Computed once, at the moment a page calls taskTray.open() — the task's
// initial draft has to already exist before the component ever mounts,
// since draft state now lives in the tray, not in a component effect.
export function defaultBookingDraft(bookingToEdit: Booking | null): BookingFormDraft {
  const shared = {
    isCreatingFarmer: false,
    newFarmerName: "",
    newFarmerPhone: "",
    isCreatingVillage: false,
    newVillageName: "",
    isEditingVillage: false,
    editVillageName: "",
  };
  if (bookingToEdit) {
    return {
      ...shared,
      customerId: bookingToEdit.customerId,
      villageId: bookingToEdit.villageId,
      machineId: bookingToEdit.machineId || "",
      driverId: bookingToEdit.driverId || "",
      scheduledDate: bookingToEdit.scheduledDate.slice(0, 10),
      scheduledTime: bookingToEdit.scheduledTime ? bookingToEdit.scheduledTime.slice(11, 16) || "09:00" : "09:00",
      workDescription: bookingToEdit.workDescription || "",
      notes: bookingToEdit.notes || "",
    };
  }
  return {
    ...shared,
    customerId: "",
    villageId: "",
    machineId: "",
    driverId: "",
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: "09:00",
    workDescription: "",
    notes: "",
  };
}

export const BookingFormTask: TaskContentComponent<BookingFormInitProps> = ({ taskId, initProps, onRequestClose }) => {
  const { bookingToEdit } = initProps;
  const [draft, setDraft] = useTaskDraft<BookingFormDraft>(taskId, defaultBookingDraft(bookingToEdit));

  const customerTerm = getTerm("customer");
  const villageTerm = getTerm("village");
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");

  // Reference option lists — ephemeral, always re-fetched fresh on mount
  // (including on remount after being minimized) rather than persisted,
  // so a restored task never shows stale customer/machine/driver lists.
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingVillage, setIsSavingVillage] = useState(false);
  const [isSavingVillageEdit, setIsSavingVillageEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [cList, vList, mList, dList] = await Promise.all([
          api.listCustomers(),
          api.listVillages(),
          api.listMachines(),
          api.listDrivers(),
        ]);
        setCustomers(cList);
        setVillages(vList);
        setMachines(mList);
        setDrivers(dList);
      } catch (err: any) {
        console.error("Failed to load options:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    }
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomerChange = (cId: string) => {
    const selected = customers.find((c) => c.id === cId);
    setDraft({ customerId: cId, ...(selected?.villageId ? { villageId: selected.villageId } : {}) });
  };

  const handleQuickCreateFarmer = async () => {
    if (!draft.newFarmerName.trim() || !draft.villageId) {
      setError(`Please select a ${villageTerm} and enter ${customerTerm} name.`);
      return;
    }
    try {
      const created = await api.createCustomer({
        name: draft.newFarmerName.trim(),
        phone: draft.newFarmerPhone.trim() || undefined,
        villageId: draft.villageId,
      });
      setCustomers((prev) => [...prev, created]);
      setDraft({ customerId: created.id, isCreatingFarmer: false, newFarmerName: "", newFarmerPhone: "" });
    } catch (err: any) {
      setError(err.message || `Failed to create ${customerTerm}`);
    }
  };

  const handleQuickCreateVillage = async () => {
    if (!draft.newVillageName.trim()) {
      setError(`Please enter a name for the new ${villageTerm.toLowerCase()}`);
      return;
    }
    setIsSavingVillage(true);
    setError(null);
    try {
      const created = await api.createVillage({ name: draft.newVillageName.trim() });
      setVillages((prev) => [...prev, created]);
      setDraft({ villageId: created.id, newVillageName: "", isCreatingVillage: false });
      notifyDataRefresh("villages");
    } catch (err: any) {
      setError(err.message || `Failed to create new ${villageTerm}`);
    } finally {
      setIsSavingVillage(false);
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
    setIsSubmitting(true);
    setError(null);

    let activeVillageId = draft.villageId;
    let activeCustomerId = draft.customerId;

    if (draft.isCreatingVillage && draft.newVillageName.trim()) {
      try {
        const createdV = await api.createVillage({ name: draft.newVillageName.trim() });
        setVillages((prev) => [...prev, createdV]);
        activeVillageId = createdV.id;
        setDraft({ villageId: createdV.id, newVillageName: "", isCreatingVillage: false });
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

    if (draft.isCreatingFarmer && draft.newFarmerName.trim()) {
      try {
        const createdC = await api.createCustomer({
          name: draft.newFarmerName.trim(),
          phone: draft.newFarmerPhone.trim() || undefined,
          villageId: activeVillageId,
        });
        setCustomers((prev) => [...prev, createdC]);
        activeCustomerId = createdC.id;
        setDraft({ customerId: createdC.id, newFarmerName: "", newFarmerPhone: "", isCreatingFarmer: false });
      } catch (cErr: any) {
        setError(cErr.message || `Failed to create new ${customerTerm.toLowerCase()}`);
        setIsSubmitting(false);
        return;
      }
    }

    if (!activeCustomerId) {
      setError(`Please select or add a ${customerTerm}`);
      setIsSubmitting(false);
      return;
    }

    if (!draft.workDescription.trim()) {
      setError("Please describe the work needed");
      setIsSubmitting(false);
      return;
    }

    try {
      if (bookingToEdit) {
        await api.updateBookingDetails(bookingToEdit.id, {
          customerId: activeCustomerId,
          villageId: activeVillageId,
          scheduledDate: draft.scheduledDate,
          scheduledTime: draft.scheduledTime ? `${draft.scheduledTime}:00` : undefined,
          workDescription: draft.workDescription.trim(),
          notes: draft.notes || undefined,
        });

        if (draft.machineId !== (bookingToEdit.machineId || "")) {
          await api.assignBookingMachine(bookingToEdit.id, draft.machineId || null);
        }
        if (draft.driverId !== (bookingToEdit.driverId || "")) {
          await api.assignBookingDriver(bookingToEdit.id, draft.driverId || null);
        }
      } else {
        const payload: CreateBookingPayload = {
          customerId: activeCustomerId,
          villageId: activeVillageId,
          machineId: draft.machineId || undefined,
          driverId: draft.driverId || undefined,
          scheduledDate: draft.scheduledDate,
          scheduledTime: draft.scheduledTime ? `${draft.scheduledTime}:00` : undefined,
          workDescription: draft.workDescription.trim(),
          notes: draft.notes || undefined,
        };
        await api.createBooking(payload);
      }

      notifyDataRefresh("bookings");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to save booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sa-booking-form" style={{ padding: "1.5rem" }}>
      {error && <div className="sa-alert sa-alert-danger">{error}</div>}

      {isLoadingOptions && <div className="sa-alert sa-alert-info">Loading options...</div>}

      {/* 1. Customer */}
      <div className="sa-input-group">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <label className="sa-input-label" style={{ margin: 0 }}>{customerTerm} *</label>
          <button
            type="button"
            className="sa-btn sa-btn-secondary"
            style={{ fontSize: "0.75rem", padding: "2px 8px" }}
            onClick={() => setDraft({ isCreatingFarmer: !draft.isCreatingFarmer })}
          >
            {draft.isCreatingFarmer ? "Cancel Quick Create" : `+ Quick Create ${customerTerm}`}
          </button>
        </div>

        {draft.isCreatingFarmer ? (
          <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
            <div className="sa-form-grid-2">
              <Input
                label={`${customerTerm} Name *`}
                type="text"
                placeholder="e.g. Ramesh Behera"
                value={draft.newFarmerName}
                onChange={(e) => setDraft({ newFarmerName: e.target.value })}
              />
              <Input
                label="Mobile Number (Optional)"
                type="tel"
                placeholder="e.g. 9876543210"
                value={draft.newFarmerPhone}
                onChange={(e) => setDraft({ newFarmerPhone: e.target.value })}
              />
            </div>
            <Button type="button" variant="primary" size="sm" onClick={handleQuickCreateFarmer} style={{ marginTop: "8px" }}>
              Save & Select {customerTerm}
            </Button>
          </div>
        ) : (
          <SearchableSelect
            placeholder={`-- Select ${customerTerm} --`}
            value={draft.customerId}
            onChange={handleCustomerChange}
            options={customers.map((c) => ({
              value: c.id,
              label: `${c.name}${c.village ? ` (${c.village.name})` : ""}`,
            }))}
          />
        )}
      </div>

      {/* 2. Village */}
      <div className="sa-input-group">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <label className="sa-input-label">{villageTerm} *</label>
          <button
            type="button"
            className="sa-link-action"
            onClick={() => setDraft({ isCreatingVillage: !draft.isCreatingVillage })}
          >
            {draft.isCreatingVillage ? "Cancel" : `+ Quick Create ${villageTerm}`}
          </button>
        </div>

        {draft.isCreatingVillage ? (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Input
              placeholder={`Enter new ${villageTerm.toLowerCase()} name`}
              value={draft.newVillageName}
              onChange={(e) => setDraft({ newVillageName: e.target.value })}
              style={{ flex: 1 }}
              autoFocus
            />
            <Button type="button" variant="primary" size="sm" onClick={handleQuickCreateVillage} isLoading={isSavingVillage}>
              Save
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
            <Button type="button" variant="primary" size="sm" onClick={handleSaveVillageEdit} isLoading={isSavingVillageEdit}>
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
              <button type="button" className="sa-icon-action" title={`Rename this ${villageTerm.toLowerCase()}`} onClick={handleStartEditVillage}>
                <Pencil size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Machine & 4. Driver Row */}
      <div className="sa-form-grid-2">
        <div className="sa-input-group">
          <label className="sa-input-label">{machineTerm} (Optional)</label>
          <SearchableSelect
            placeholder="-- Unassigned --"
            value={draft.machineId}
            onChange={(v) => setDraft({ machineId: v })}
            options={[
              { value: "", label: "-- Unassigned --" },
              ...machines.map((m) => ({ value: m.id, label: `${m.registrationNumber}${m.brand ? ` (${m.brand})` : ""}` })),
            ]}
          />
        </div>

        <div className="sa-input-group">
          <label className="sa-input-label">{driverTerm} (Optional)</label>
          <SearchableSelect
            placeholder="-- Unassigned --"
            value={draft.driverId}
            onChange={(v) => setDraft({ driverId: v })}
            options={[
              { value: "", label: "-- Unassigned --" },
              ...drivers.map((d) => ({ value: d.id, label: d.employee.name })),
            ]}
          />
        </div>
      </div>

      {/* 5. Date & Time */}
      <div className="sa-form-grid-2">
        <Input
          label="Scheduled Date *"
          type="date"
          value={draft.scheduledDate}
          onChange={(e) => setDraft({ scheduledDate: e.target.value })}
          required
        />
        <Input
          label="Scheduled Time"
          type="time"
          value={draft.scheduledTime}
          onChange={(e) => setDraft({ scheduledTime: e.target.value })}
        />
      </div>

      {/* 6. Work Needed */}
      <div className="sa-input-group">
        <label className="sa-input-label">Work Needed *</label>
        <textarea
          className="sa-input sa-textarea"
          rows={2}
          value={draft.workDescription}
          onChange={(e) => setDraft({ workDescription: e.target.value })}
          placeholder="e.g. Rotavator — 1 acre field"
          required
        />
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
          Just enough to get this on the schedule — exact hours and price aren't needed yet. Pricing is decided live, once work actually starts.
        </p>
      </div>

      {/* 7. Notes */}
      <div className="sa-input-group">
        <label className="sa-input-label">Notes (Optional)</label>
        <textarea
          className="sa-input sa-textarea"
          rows={2}
          value={draft.notes}
          onChange={(e) => setDraft({ notes: e.target.value })}
          placeholder="Special instructions or field location notes..."
        />
      </div>

      <div className="sa-form-actions">
        <Button type="button" variant="secondary" onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {bookingToEdit ? "Save Changes" : "Create Booking"}
        </Button>
      </div>
    </form>
  );
};
