import React, { useEffect, useState } from "react";
import type {
  CreateMachinePayload,
  FuelType,
  Machine,
  MachineStatus,
  MachineType,
} from "../../types/machine";
import type { DriverOption } from "../../types/booking";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";
import { UpgradePlanDialog } from "../../components/ui/UpgradePlanDialog";
import { ApiError } from "../../lib/api";

interface MachineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  machineToEdit?: Machine | null;
}

export const MachineFormModal: React.FC<MachineFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  machineToEdit,
}) => {
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");

  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  const [machineTypeId, setMachineTypeId] = useState<string>("");
  const [registrationNumber, setRegistrationNumber] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [purchaseYear, setPurchaseYear] = useState<string>("");
  const [fuelType, setFuelType] = useState<FuelType>("DIESEL");
  const [status, setStatus] = useState<MachineStatus>("AVAILABLE");
  const [hourMeterReading, setHourMeterReading] = useState<string>("0");
  const [insuranceNumber, setInsuranceNumber] = useState<string>("");
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<string>("");
  const [assignedDriverId, setAssignedDriverId] = useState<string>("");
  const [nextServiceDueHours, setNextServiceDueHours] = useState<string>("");
  const [lastServiceDate, setLastServiceDate] = useState<string>("");
  const [lastServiceHourMeter, setLastServiceHourMeter] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState<{ message: string; upgradeUrl: string } | null>(null);

  // Quick Create Machine Type inline state
  const [isCreatingMachineType, setIsCreatingMachineType] = useState<boolean>(false);
  const [newMachineTypeName, setNewMachineTypeName] = useState<string>("");
  const [isSavingMachineType, setIsSavingMachineType] = useState<boolean>(false);

  const handleQuickCreateMachineType = async () => {
    if (!newMachineTypeName.trim()) {
      setError(`Please enter a name for the new ${machineTerm.toLowerCase()} type`);
      return;
    }
    setIsSavingMachineType(true);
    setError(null);
    try {
      const created = await api.createMachineType({ name: newMachineTypeName.trim() });
      setMachineTypes((prev) => [...prev, created]);
      setMachineTypeId(created.id);
      setNewMachineTypeName("");
      setIsCreatingMachineType(false);
    } catch (err: any) {
      setError(err.message || `Failed to create new ${machineTerm.toLowerCase()} type`);
    } finally {
      setIsSavingMachineType(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [mtList, dList] = await Promise.all([
          api.listMachineTypes(),
          api.listDrivers(),
        ]);
        setMachineTypes(mtList);
        setDrivers(dList);

        if (!machineToEdit && mtList.length > 0 && !machineTypeId) {
          setMachineTypeId(mtList[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load machine form options:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
  }, [isOpen, machineToEdit]);

  useEffect(() => {
    if (machineToEdit) {
      setMachineTypeId(machineToEdit.machineTypeId);
      setRegistrationNumber(machineToEdit.registrationNumber);
      setBrand(machineToEdit.brand || "");
      setModel(machineToEdit.model || "");
      setPurchaseYear(machineToEdit.purchaseYear ? machineToEdit.purchaseYear.toString() : "");
      setFuelType(machineToEdit.fuelType || "DIESEL");
      setStatus(machineToEdit.status || "AVAILABLE");
      setHourMeterReading(machineToEdit.hourMeterReading.toString());
      setInsuranceNumber(machineToEdit.insuranceNumber || "");
      setInsuranceExpiryDate(
        machineToEdit.insuranceExpiryDate ? machineToEdit.insuranceExpiryDate.slice(0, 10) : ""
      );
      setAssignedDriverId(machineToEdit.assignedDriverId || "");
      setNextServiceDueHours(
        machineToEdit.nextServiceDueHours != null ? machineToEdit.nextServiceDueHours.toString() : ""
      );
      setLastServiceDate(
        machineToEdit.lastServiceDate ? machineToEdit.lastServiceDate.slice(0, 10) : ""
      );
      setLastServiceHourMeter(
        machineToEdit.lastServiceHourMeter != null ? machineToEdit.lastServiceHourMeter.toString() : ""
      );
      setIsActive(machineToEdit.isActive ?? true);
    } else {
      setRegistrationNumber("");
      setBrand("");
      setModel("");
      setPurchaseYear("");
      setFuelType("DIESEL");
      setStatus("AVAILABLE");
      setHourMeterReading("0");
      setInsuranceNumber("");
      setInsuranceExpiryDate("");
      setAssignedDriverId("");
      setNextServiceDueHours("");
      setLastServiceDate("");
      setLastServiceHourMeter("");
      setIsActive(true);
    }
  }, [machineToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineTypeId) {
      setError(`Please select a ${machineTerm} type`);
      return;
    }
    if (!registrationNumber.trim()) {
      setError("Please enter a registration number");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateMachinePayload = {
      machineTypeId,
      registrationNumber: registrationNumber.trim().toUpperCase(),
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      purchaseYear: purchaseYear ? parseInt(purchaseYear, 10) : undefined,
      fuelType,
      status,
      hourMeterReading: hourMeterReading ? parseFloat(hourMeterReading) : 0,
      insuranceNumber: insuranceNumber.trim() || undefined,
      insuranceExpiryDate: insuranceExpiryDate || undefined,
      assignedDriverId: assignedDriverId || undefined,
      nextServiceDueHours: nextServiceDueHours ? parseFloat(nextServiceDueHours) : undefined,
      lastServiceDate: lastServiceDate || undefined,
      lastServiceHourMeter: lastServiceHourMeter ? parseFloat(lastServiceHourMeter) : undefined,
      isActive,
    };

    try {
      if (machineToEdit) {
        await api.updateMachine(machineToEdit.id, payload);
      } else {
        await api.createMachine(payload);
      }
      onSuccess();
      onClose();
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={machineToEdit ? `Edit ${machineTerm} ${machineToEdit.registrationNumber}` : `Register New ${machineTerm}`}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}
        {isLoadingOptions && <div className="sa-alert sa-alert-info">Loading equipment options...</div>}

        {/* 1. Machine Type & Registration Number */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className="sa-input-label">{machineTerm} Type *</label>
              {!isCreatingMachineType && (
                <button
                  type="button"
                  onClick={() => setIsCreatingMachineType(true)}
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
                  + Add Type
                </button>
              )}
            </div>

            {isCreatingMachineType ? (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <Input
                  placeholder="e.g. Combine Harvester"
                  value={newMachineTypeName}
                  onChange={(e) => setNewMachineTypeName(e.target.value)}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleQuickCreateMachineType}
                  isLoading={isSavingMachineType}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreatingMachineType(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <SearchableSelect
                placeholder="-- Select Type --"
                value={machineTypeId}
                onChange={setMachineTypeId}
                options={machineTypes.map((mt) => ({
                  value: mt.id,
                  label: `${mt.name}${mt.category ? ` (${mt.category})` : ""}`,
                }))}
              />
            )}
          </div>

          <Input
            label="Registration Number *"
            type="text"
            placeholder="e.g. KA-05-AG-1234"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
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
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <Input
            label="Model"
            type="text"
            placeholder="e.g. 575 DI, 5050 D"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>

        {/* 3. Fuel Type & Operational Status */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <label className="sa-input-label">Fuel Type</label>
            <select
              className="sa-input"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
            >
              <option value="DIESEL">Diesel</option>
              <option value="PETROL">Petrol</option>
              <option value="ELECTRIC">Electric</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="sa-input-group">
            <label className="sa-input-label">Status</label>
            <select
              className="sa-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as MachineStatus)}
            >
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
            value={hourMeterReading}
            onChange={(e) => setHourMeterReading(e.target.value)}
            placeholder="e.g. 1420.5"
          />

          <div className="sa-input-group">
            <label className="sa-input-label">Assigned Default {driverTerm}</label>
            <SearchableSelect
              placeholder="-- Unassigned --"
              value={assignedDriverId}
              onChange={setAssignedDriverId}
              options={[
                { value: "", label: "-- Unassigned --" },
                ...drivers.map((d) => ({ value: d.id, label: d.employee.name })),
              ]}
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
            value={nextServiceDueHours}
            onChange={(e) => setNextServiceDueHours(e.target.value)}
            placeholder="e.g. 1500"
          />
          <Input
            label="Insurance Number"
            type="text"
            placeholder="e.g. POL-88723-AG"
            value={insuranceNumber}
            onChange={(e) => setInsuranceNumber(e.target.value)}
          />
        </div>

        <div className="sa-form-grid-2">
          <Input
            label="Insurance Expiry Date"
            type="date"
            value={insuranceExpiryDate}
            onChange={(e) => setInsuranceExpiryDate(e.target.value)}
          />

          <Input
            label="Purchase Year"
            type="number"
            min="1990"
            max="2030"
            value={purchaseYear}
            onChange={(e) => setPurchaseYear(e.target.value)}
            placeholder="e.g. 2022"
          />
        </div>

        {/* Form Actions */}
        <div className="sa-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
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
    </Modal>
  );
};
