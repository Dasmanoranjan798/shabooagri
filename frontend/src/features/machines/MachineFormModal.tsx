import React, { useEffect, useState } from "react";
import type {
  CreateMachinePayload,
  FuelType,
  Machine,
  MachineStatus,
  MachineType,
} from "../../types/machine";
import type { DriverOption } from "../../types/booking";
import { api, ApiError } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";
import { UpgradePlanDialog } from "../../components/ui/UpgradePlanDialog";

// Migrated onto the shared task-tray system (Pass 2, Batch 1) — see
// BookingFormModal.tsx for the full explanation of the new contract.

export interface MachineFormInitProps {
  machineToEdit: Machine | null;
}

export interface MachineFormDraft {
  machineTypeId: string;
  registrationNumber: string;
  brand: string;
  model: string;
  purchaseYear: string;
  fuelType: FuelType;
  status: MachineStatus;
  hourMeterReading: string;
  insuranceNumber: string;
  insuranceExpiryDate: string;
  assignedDriverId: string;
  nextServiceDueHours: string;
  lastServiceDate: string;
  lastServiceHourMeter: string;
  isActive: boolean;
  isCreatingMachineType: boolean;
  newMachineTypeName: string;
}

export function defaultMachineDraft(machineToEdit: Machine | null): MachineFormDraft {
  const shared = { isCreatingMachineType: false, newMachineTypeName: "" };
  if (machineToEdit) {
    return {
      ...shared,
      machineTypeId: machineToEdit.machineTypeId,
      registrationNumber: machineToEdit.registrationNumber,
      brand: machineToEdit.brand || "",
      model: machineToEdit.model || "",
      purchaseYear: machineToEdit.purchaseYear ? machineToEdit.purchaseYear.toString() : "",
      fuelType: machineToEdit.fuelType || "DIESEL",
      status: machineToEdit.status || "AVAILABLE",
      hourMeterReading: machineToEdit.hourMeterReading.toString(),
      insuranceNumber: machineToEdit.insuranceNumber || "",
      insuranceExpiryDate: machineToEdit.insuranceExpiryDate ? machineToEdit.insuranceExpiryDate.slice(0, 10) : "",
      assignedDriverId: machineToEdit.assignedDriverId || "",
      nextServiceDueHours: machineToEdit.nextServiceDueHours != null ? machineToEdit.nextServiceDueHours.toString() : "",
      lastServiceDate: machineToEdit.lastServiceDate ? machineToEdit.lastServiceDate.slice(0, 10) : "",
      lastServiceHourMeter: machineToEdit.lastServiceHourMeter != null ? machineToEdit.lastServiceHourMeter.toString() : "",
      isActive: machineToEdit.isActive ?? true,
    };
  }
  return {
    ...shared,
    machineTypeId: "",
    registrationNumber: "",
    brand: "",
    model: "",
    purchaseYear: "",
    fuelType: "DIESEL",
    status: "AVAILABLE",
    hourMeterReading: "0",
    insuranceNumber: "",
    insuranceExpiryDate: "",
    assignedDriverId: "",
    nextServiceDueHours: "",
    lastServiceDate: "",
    lastServiceHourMeter: "",
    isActive: true,
  };
}

export const MachineFormTask: TaskContentComponent<MachineFormInitProps> = ({ taskId, initProps, onRequestClose }) => {
  const { machineToEdit } = initProps;
  const [draft, setDraft] = useTaskDraft<MachineFormDraft>(taskId, defaultMachineDraft(machineToEdit));
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");

  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingMachineType, setIsSavingMachineType] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState<{ message: string; upgradeUrl: string } | null>(null);

  const handleQuickCreateMachineType = async () => {
    if (!draft.newMachineTypeName.trim()) {
      setError(`Please enter a name for the new ${machineTerm.toLowerCase()} type`);
      return;
    }
    setIsSavingMachineType(true);
    setError(null);
    try {
      const created = await api.createMachineType({ name: draft.newMachineTypeName.trim() });
      setMachineTypes((prev) => [...prev, created]);
      setDraft({ machineTypeId: created.id, newMachineTypeName: "", isCreatingMachineType: false });
    } catch (err: any) {
      setError(err.message || `Failed to create new ${machineTerm.toLowerCase()} type`);
    } finally {
      setIsSavingMachineType(false);
    }
  };

  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [mtList, dList] = await Promise.all([api.listMachineTypes(), api.listDrivers()]);
        setMachineTypes(mtList);
        setDrivers(dList);

        if (!machineToEdit && mtList.length > 0) {
          setDraft((prev) => (prev.machineTypeId ? {} : { machineTypeId: mtList[0].id }));
        }
      } catch (err: any) {
        console.error("Failed to load machine form options:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    }
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.machineTypeId) {
      setError(`Please select a ${machineTerm} type`);
      return;
    }
    if (!draft.registrationNumber.trim()) {
      setError("Please enter a registration number");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateMachinePayload = {
      machineTypeId: draft.machineTypeId,
      registrationNumber: draft.registrationNumber.trim().toUpperCase(),
      brand: draft.brand.trim() || undefined,
      model: draft.model.trim() || undefined,
      purchaseYear: draft.purchaseYear ? parseInt(draft.purchaseYear, 10) : undefined,
      fuelType: draft.fuelType,
      status: draft.status,
      hourMeterReading: draft.hourMeterReading ? parseFloat(draft.hourMeterReading) : 0,
      insuranceNumber: draft.insuranceNumber.trim() || undefined,
      insuranceExpiryDate: draft.insuranceExpiryDate || undefined,
      assignedDriverId: draft.assignedDriverId || undefined,
      nextServiceDueHours: draft.nextServiceDueHours ? parseFloat(draft.nextServiceDueHours) : undefined,
      lastServiceDate: draft.lastServiceDate || undefined,
      lastServiceHourMeter: draft.lastServiceHourMeter ? parseFloat(draft.lastServiceHourMeter) : undefined,
      isActive: draft.isActive,
    };

    try {
      if (machineToEdit) {
        await api.updateMachine(machineToEdit.id, payload);
      } else {
        await api.createMachine(payload);
      }
      notifyDataRefresh("machines");
      onRequestClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.details?.code === "MACHINE_LIMIT_REACHED") {
        setUpgradeDialog({ message: err.message, upgradeUrl: String(err.details.upgradeUrl) });
      } else {
        setError(err.message || "Failed to save machine record");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="sa-booking-form" style={{ padding: "1.5rem" }}>
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}
        {isLoadingOptions && <div className="sa-alert sa-alert-info">Loading equipment options...</div>}

        {/* 1. Machine Type & Registration Number */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className="sa-input-label">{machineTerm} Type *</label>
              {!draft.isCreatingMachineType && (
                <button
                  type="button"
                  onClick={() => setDraft({ isCreatingMachineType: true })}
                  style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  + Add Type
                </button>
              )}
            </div>

            {draft.isCreatingMachineType ? (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <Input
                  placeholder="e.g. Combine Harvester"
                  value={draft.newMachineTypeName}
                  onChange={(e) => setDraft({ newMachineTypeName: e.target.value })}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <Button type="button" variant="primary" size="sm" onClick={handleQuickCreateMachineType} isLoading={isSavingMachineType}>
                  Save
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setDraft({ isCreatingMachineType: false })}>
                  Cancel
                </Button>
              </div>
            ) : (
              <SearchableSelect
                placeholder="-- Select Type --"
                value={draft.machineTypeId}
                onChange={(v) => setDraft({ machineTypeId: v })}
                options={machineTypes.map((mt) => ({ value: mt.id, label: `${mt.name}${mt.category ? ` (${mt.category})` : ""}` }))}
              />
            )}
          </div>

          <Input
            label="Registration Number *"
            type="text"
            placeholder="e.g. KA-05-AG-1234"
            value={draft.registrationNumber}
            onChange={(e) => setDraft({ registrationNumber: e.target.value })}
            required
            autoFocus
          />
        </div>

        {/* 2. Brand, Model & Purchase Year */}
        <div className="sa-form-grid-2">
          <Input
            label="Brand / Make"
            type="text"
            placeholder="e.g. Mahindra, John Deere"
            value={draft.brand}
            onChange={(e) => setDraft({ brand: e.target.value })}
          />
          <Input
            label="Model"
            type="text"
            placeholder="e.g. 575 DI, 5050 D"
            value={draft.model}
            onChange={(e) => setDraft({ model: e.target.value })}
          />
        </div>

        {/* 3. Fuel Type & Operational Status */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <label className="sa-input-label">Fuel Type</label>
            <select className="sa-input" value={draft.fuelType} onChange={(e) => setDraft({ fuelType: e.target.value as FuelType })}>
              <option value="DIESEL">Diesel</option>
              <option value="PETROL">Petrol</option>
              <option value="ELECTRIC">Electric</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="sa-input-group">
            <label className="sa-input-label">Status</label>
            <select className="sa-input" value={draft.status} onChange={(e) => setDraft({ status: e.target.value as MachineStatus })}>
              <option value="AVAILABLE">Available</option>
              <option value="WORKING">Working (On Job)</option>
              <option value="REPAIR">Maintenance & Repair</option>
              <option value="OFFLINE">Offline / Inactive</option>
            </select>
          </div>
        </div>

        {/* 4. Hour Meter & Default Driver */}
        <div className="sa-form-grid-2">
          <Input
            label="Hour Meter Reading (hrs)"
            type="number"
            min="0"
            step="0.1"
            value={draft.hourMeterReading}
            onChange={(e) => setDraft({ hourMeterReading: e.target.value })}
            placeholder="e.g. 1420.5"
          />

          <div className="sa-input-group">
            <label className="sa-input-label">Assigned Default {driverTerm}</label>
            <SearchableSelect
              placeholder="-- Unassigned --"
              value={draft.assignedDriverId}
              onChange={(v) => setDraft({ assignedDriverId: v })}
              options={[{ value: "", label: "-- Unassigned --" }, ...drivers.map((d) => ({ value: d.id, label: d.employee.name }))]}
            />
          </div>
        </div>

        {/* 5. Service & Insurance Tracking */}
        <div className="sa-form-grid-2">
          <Input
            label="Next Service Due (hrs)"
            type="number"
            min="0"
            step="1"
            value={draft.nextServiceDueHours}
            onChange={(e) => setDraft({ nextServiceDueHours: e.target.value })}
            placeholder="e.g. 1500"
          />
          <Input
            label="Insurance Number"
            type="text"
            placeholder="e.g. POL-88723-AG"
            value={draft.insuranceNumber}
            onChange={(e) => setDraft({ insuranceNumber: e.target.value })}
          />
        </div>

        <div className="sa-form-grid-2">
          <Input
            label="Insurance Expiry Date"
            type="date"
            value={draft.insuranceExpiryDate}
            onChange={(e) => setDraft({ insuranceExpiryDate: e.target.value })}
          />
          <Input
            label="Purchase Year"
            type="number"
            min="1990"
            max="2030"
            value={draft.purchaseYear}
            onChange={(e) => setDraft({ purchaseYear: e.target.value })}
            placeholder="e.g. 2022"
          />
        </div>

        <div className="sa-form-actions">
          <Button type="button" variant="secondary" onClick={onRequestClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {machineToEdit ? "Save Machine" : "Register Machine"}
          </Button>
        </div>
      </form>

      <UpgradePlanDialog
        isOpen={!!upgradeDialog}
        onClose={() => setUpgradeDialog(null)}
        message={upgradeDialog?.message ?? ""}
        upgradeUrl={upgradeDialog?.upgradeUrl ?? "#"}
      />
    </>
  );
};
