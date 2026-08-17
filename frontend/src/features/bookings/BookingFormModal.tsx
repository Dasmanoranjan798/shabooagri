import React, { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type {
  Booking,
  CreateBookingPayload,
  CustomerOption,
  DriverOption,
  MachineOption,
  PricingMethodOption,
  VillageOption,
} from "../../types/booking";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingToEdit?: Booking | null;
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bookingToEdit,
}) => {
  const customerTerm = getTerm("customer");
  const villageTerm = getTerm("village");
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [pricingMethods, setPricingMethods] = useState<PricingMethodOption[]>([]);

  const [customerId, setCustomerId] = useState<string>("");
  const [villageId, setVillageId] = useState<string>("");
  const [machineId, setMachineId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [pricingMethodId, setPricingMethodId] = useState<string>("");
  const [rate, setRate] = useState<string>("500");
  const [estimatedHours, setEstimatedHours] = useState<string>("2");
  const [estimatedAcres, setEstimatedAcres] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Quick Create Farmer inline state
  const [isCreatingFarmer, setIsCreatingFarmer] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState("");
  const [newFarmerPhone, setNewFarmerPhone] = useState("");

  // Quick Create Village inline state
  const [isCreatingVillage, setIsCreatingVillage] = useState(false);
  const [newVillageName, setNewVillageName] = useState("");
  const [isSavingVillage, setIsSavingVillage] = useState(false);

  const handleQuickCreateVillage = async () => {
    if (!newVillageName.trim()) {
      setError(`Please enter a name for the new ${villageTerm.toLowerCase()}`);
      return;
    }
    setIsSavingVillage(true);
    setError(null);
    try {
      const created = await api.createVillage({ name: newVillageName.trim() });
      setVillages((prev) => [...prev, created]);
      setVillageId(created.id);
      setNewVillageName("");
      setIsCreatingVillage(false);
    } catch (err: any) {
      setError(err.message || `Failed to create new ${villageTerm}`);
    } finally {
      setIsSavingVillage(false);
    }
  };

  // Rename inline state — fixes a mis-typed village name without needing a
  // dedicated Villages management screen (none exists; villages are only
  // ever created inline from here and the Customer form).
  const [isEditingVillage, setIsEditingVillage] = useState(false);
  const [editVillageName, setEditVillageName] = useState("");
  const [isSavingVillageEdit, setIsSavingVillageEdit] = useState(false);

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

  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [cList, vList, mList, dList, pList] = await Promise.all([
          api.listCustomers(),
          api.listVillages(),
          api.listMachines(),
          api.listDrivers(),
          api.listPricingMethods(),
        ]);
        setCustomers(cList);
        setVillages(vList);
        setMachines(mList);
        setDrivers(dList);
        setPricingMethods(pList);

        if (!bookingToEdit && pList.length > 0 && !pricingMethodId) {
          const perHour = pList.find((p) => p.key === "per_hour") || pList[0];
          setPricingMethodId(perHour.id);
        }
      } catch (err: any) {
        console.error("Failed to load options:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
  }, [isOpen, bookingToEdit]);

  useEffect(() => {
    if (bookingToEdit) {
      setCustomerId(bookingToEdit.customerId);
      setVillageId(bookingToEdit.villageId);
      setMachineId(bookingToEdit.machineId || "");
      setDriverId(bookingToEdit.driverId || "");
      setScheduledDate(bookingToEdit.scheduledDate.slice(0, 10));
      setScheduledTime(
        bookingToEdit.scheduledTime
          ? bookingToEdit.scheduledTime.slice(11, 16) || "09:00"
          : "09:00"
      );
      setPricingMethodId(bookingToEdit.pricingMethodId);
      setRate(bookingToEdit.rate.toString());
      setEstimatedHours(
        bookingToEdit.estimatedHours != null ? bookingToEdit.estimatedHours.toString() : ""
      );
      setEstimatedAcres(
        bookingToEdit.estimatedAcres != null ? bookingToEdit.estimatedAcres.toString() : ""
      );
      setNotes(bookingToEdit.notes || "");
    } else {
      setCustomerId("");
      setVillageId("");
      setMachineId("");
      setDriverId("");
      setScheduledDate(new Date().toISOString().slice(0, 10));
      setScheduledTime("09:00");
      setRate("500");
      setEstimatedHours("2");
      setEstimatedAcres("");
      setNotes("");
    }
  }, [bookingToEdit, isOpen]);

  // When customer changes, auto-set village
  const handleCustomerChange = (cId: string) => {
    setCustomerId(cId);
    const selected = customers.find((c) => c.id === cId);
    if (selected && selected.villageId) {
      setVillageId(selected.villageId);
    }
  };

  const handleQuickCreateFarmer = async () => {
    if (!newFarmerName.trim() || !villageId) {
      setError(`Please select a ${villageTerm} and enter ${customerTerm} name.`);
      return;
    }
    try {
      const created = await api.createCustomer({
        name: newFarmerName.trim(),
        phone: newFarmerPhone.trim() || undefined,
        villageId,
      });
      setCustomers((prev) => [...prev, created]);
      setCustomerId(created.id);
      setIsCreatingFarmer(false);
      setNewFarmerName("");
      setNewFarmerPhone("");
    } catch (err: any) {
      setError(err.message || `Failed to create ${customerTerm}`);
    }
  };

  const selectedPricingMethod = pricingMethods.find((p) => p.id === pricingMethodId);

  // Live estimated amount calculation for UI preview
  const calcEstimate = (): number | null => {
    const r = parseFloat(rate);
    if (isNaN(r) || r <= 0) return null;
    if (!selectedPricingMethod) return r;

    const unit = selectedPricingMethod.unit;
    const hours = parseFloat(estimatedHours);
    const acres = parseFloat(estimatedAcres);

    if (unit === "hour") return !isNaN(hours) ? r * hours : null;
    if (unit === "minute") return !isNaN(hours) ? r * hours * 60 : null;
    if (unit === "acre") return !isNaN(acres) ? r * acres : null;
    return r;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let activeVillageId = villageId;
    let activeCustomerId = customerId;

    // Auto-create new village if inline creation is active
    if (isCreatingVillage && newVillageName.trim()) {
      try {
        const createdV = await api.createVillage({ name: newVillageName.trim() });
        setVillages((prev) => [...prev, createdV]);
        activeVillageId = createdV.id;
        setVillageId(createdV.id);
        setNewVillageName("");
        setIsCreatingVillage(false);
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

    // Auto-create new farmer if inline creation is active
    if (isCreatingFarmer && newFarmerName.trim()) {
      try {
        const createdC = await api.createCustomer({
          name: newFarmerName.trim(),
          phone: newFarmerPhone.trim() || undefined,
          villageId: activeVillageId,
        });
        setCustomers((prev) => [...prev, createdC]);
        activeCustomerId = createdC.id;
        setCustomerId(createdC.id);
        setNewFarmerName("");
        setNewFarmerPhone("");
        setIsCreatingFarmer(false);
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

    if (!pricingMethodId) {
      setError("Please select a pricing method");
      setIsSubmitting(false);
      return;
    }

    try {
      if (bookingToEdit) {
        await api.updateBookingDetails(bookingToEdit.id, {
          customerId: activeCustomerId,
          villageId: activeVillageId,
          scheduledDate,
          scheduledTime: scheduledTime ? `${scheduledTime}:00` : undefined,
          pricingMethodId,
          rate: parseFloat(rate),
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
          estimatedAcres: estimatedAcres ? parseFloat(estimatedAcres) : undefined,
          notes: notes || undefined,
        });

        // Update assigned machine/driver if changed
        if (machineId !== (bookingToEdit.machineId || "")) {
          await api.assignBookingMachine(bookingToEdit.id, machineId || null);
        }
        if (driverId !== (bookingToEdit.driverId || "")) {
          await api.assignBookingDriver(bookingToEdit.id, driverId || null);
        }
      } else {
        const payload: CreateBookingPayload = {
          customerId: activeCustomerId,
          villageId: activeVillageId,
          machineId: machineId || undefined,
          driverId: driverId || undefined,
          scheduledDate,
          scheduledTime: scheduledTime ? `${scheduledTime}:00` : undefined,
          pricingMethodId,
          rate: parseFloat(rate),
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
          estimatedAcres: estimatedAcres ? parseFloat(estimatedAcres) : undefined,
          notes: notes || undefined,
        };
        await api.createBooking(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedTotal = calcEstimate();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bookingToEdit ? `Edit Booking ${bookingToEdit.bookingNumber}` : `Create New Booking`}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}

        {isLoadingOptions && (
          <div className="sa-alert sa-alert-info">Loading options...</div>
        )}

        {/* 1. Customer */}
        <div className="sa-input-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <label className="sa-input-label" style={{ margin: 0 }}>{customerTerm} *</label>
            <button
              type="button"
              className="sa-btn sa-btn-secondary"
              style={{ fontSize: "0.75rem", padding: "2px 8px" }}
              onClick={() => setIsCreatingFarmer(!isCreatingFarmer)}
            >
              {isCreatingFarmer ? "Cancel Quick Create" : `+ Quick Create ${customerTerm}`}
            </button>
          </div>

          {isCreatingFarmer ? (
            <div style={{ background: "var(--color-bg-secondary)", padding: "10px", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
              <div className="sa-form-grid-2">
                <Input
                  label={`${customerTerm} Name *`}
                  type="text"
                  placeholder="e.g. Ramesh Behera"
                  value={newFarmerName}
                  onChange={(e) => setNewFarmerName(e.target.value)}
                />
                <Input
                  label="Mobile Number (Optional)"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newFarmerPhone}
                  onChange={(e) => setNewFarmerPhone(e.target.value)}
                />
              </div>
              <Button type="button" variant="primary" size="sm" onClick={handleQuickCreateFarmer} style={{ marginTop: "8px" }}>
                Save & Select {customerTerm}
              </Button>
            </div>
          ) : (
            <SearchableSelect
              placeholder={`-- Select ${customerTerm} --`}
              value={customerId}
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
              onClick={() => setIsCreatingVillage(!isCreatingVillage)}
            >
              {isCreatingVillage ? "Cancel" : `+ Quick Create ${villageTerm}`}
            </button>
          </div>

          {isCreatingVillage ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Input
                placeholder={`Enter new ${villageTerm.toLowerCase()} name`}
                value={newVillageName}
                onChange={(e) => setNewVillageName(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleQuickCreateVillage}
                isLoading={isSavingVillage}
              >
                Save
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

        {/* 3. Machine & 4. Driver Row */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <label className="sa-input-label">{machineTerm} (Optional)</label>
            <SearchableSelect
              placeholder="-- Unassigned --"
              value={machineId}
              onChange={setMachineId}
              options={[
                { value: "", label: "-- Unassigned --" },
                ...machines.map((m) => ({
                  value: m.id,
                  label: `${m.registrationNumber}${m.brand ? ` (${m.brand})` : ""}`,
                })),
              ]}
            />
          </div>

          <div className="sa-input-group">
            <label className="sa-input-label">{driverTerm} (Optional)</label>
            <SearchableSelect
              placeholder="-- Unassigned --"
              value={driverId}
              onChange={setDriverId}
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
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />
          <Input
            label="Scheduled Time"
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>

        {/* 6. Pricing Method Selector */}
        <div className="sa-input-group">
          <label className="sa-input-label">Pricing Method *</label>
          <div className="sa-segmented-control">
            {pricingMethods.map((pm) => (
              <button
                type="button"
                key={pm.id}
                className={`sa-segmented-btn ${pricingMethodId === pm.id ? "is-active" : ""}`}
                onClick={() => setPricingMethodId(pm.id)}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* 7. Rate & Quantity Input */}
        <div className="sa-form-grid-2">
          <Input
            label="Rate (₹) *"
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />

          {selectedPricingMethod?.unit === "acre" ? (
            <Input
              label="Estimated Acres"
              type="number"
              min="0"
              step="0.1"
              value={estimatedAcres}
              onChange={(e) => setEstimatedAcres(e.target.value)}
              placeholder="e.g. 5"
            />
          ) : (
            <Input
              label="Estimated Hours"
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 2.5"
            />
          )}
        </div>

        {/* Live Estimate Banner */}
        {estimatedTotal != null && (
          <div className="sa-estimate-banner">
            <span>Estimated Total Amount:</span>
            <strong>{formatCurrency(estimatedTotal)}</strong>
          </div>
        )}

        {/* 8. Notes */}
        <div className="sa-input-group">
          <label className="sa-input-label">Notes (Optional)</label>
          <textarea
            className="sa-input sa-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions or field location notes..."
          />
        </div>

        {/* Form Actions */}
        <div className="sa-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {bookingToEdit ? "Save Changes" : "Create Booking"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
