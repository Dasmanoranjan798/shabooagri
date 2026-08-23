import { useEffect, useState } from "react";
import type { CustomerOption, DriverOption, MachineOption, PricingMethodOption, VillageOption } from "../../types/booking";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

// Migrated onto the shared task-tray system (Pass 2, Batch 2) — see
// BookingFormModal.tsx for the full explanation of the new contract.
// Always a create-only form (no edit mode), so no initProps are needed.

export type ManualJobEntryInitProps = Record<string, never>;

export interface ManualJobEntryDraft {
  customerId: string;
  villageId: string;
  machineId: string;
  driverId: string;
  workDate: string;
  startTimeStr: string;
  endTimeStr: string;
  pricingMethodId: string;
  rate: string;
  minimumCharge: string;
  actualHoursInput: string;
  completedAcres: string;
  fuelUsedLitres: string;
  notes: string;
  isCreatingFarmer: boolean;
  newFarmerName: string;
  newFarmerPhone: string;
}

export function defaultManualJobEntryDraft(): ManualJobEntryDraft {
  return {
    customerId: "",
    villageId: "",
    machineId: "",
    driverId: "",
    workDate: new Date().toISOString().slice(0, 10),
    startTimeStr: "08:00",
    endTimeStr: "12:00",
    pricingMethodId: "",
    rate: "500",
    minimumCharge: "",
    actualHoursInput: "",
    completedAcres: "",
    fuelUsedLitres: "",
    notes: "",
    isCreatingFarmer: false,
    newFarmerName: "",
    newFarmerPhone: "",
  };
}

export const ManualJobEntryTask: TaskContentComponent<ManualJobEntryInitProps> = ({ taskId, onRequestClose }) => {
  const customerTerm = getTerm("customer");
  const villageTerm = getTerm("village");
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");
  const [draft, setDraft] = useTaskDraft<ManualJobEntryDraft>(taskId, defaultManualJobEntryDraft());

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [pricingMethods, setPricingMethods] = useState<PricingMethodOption[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true);
      setError(null);
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

        if (pList.length > 0) {
          const perHour = pList.find((p) => p.key === "per_hour") || pList[0];
          setDraft((prev) => (prev.pricingMethodId ? {} : { pricingMethodId: perHour.id }));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load form options");
      } finally {
        setIsLoadingOptions(false);
      }
    }
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute calculated duration in hours from startTimeStr and endTimeStr
  const computeCalculatedHours = (): number => {
    if (!draft.startTimeStr || !draft.endTimeStr) return 0;
    const [sH, sM] = draft.startTimeStr.split(":").map(Number);
    const [eH, eM] = draft.endTimeStr.split(":").map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;
    const startMins = sH * 60 + sM;
    let endMins = eH * 60 + eM;
    if (endMins < startMins) endMins += 24 * 60; // overnight boundary
    const diffMins = endMins - startMins;
    return Math.round((diffMins / 60) * 100) / 100;
  };

  const calculatedHours = computeCalculatedHours();

  const handleQuickCreateFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.customerId || !draft.villageId || !draft.machineId || !draft.driverId || !draft.pricingMethodId) {
      setError("Please complete all required fields (Farmer, Village, Machine, Driver, Pricing Method).");
      return;
    }

    const startIso = `${draft.workDate}T${draft.startTimeStr}:00`;
    const endIso = `${draft.workDate}T${draft.endTimeStr}:00`;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createManualJob({
        customerId: draft.customerId,
        villageId: draft.villageId,
        machineId: draft.machineId,
        driverId: draft.driverId,
        scheduledDate: draft.workDate,
        pricingMethodId: draft.pricingMethodId,
        rate: Number(draft.rate) || 0,
        // Minimum floor only for metered methods; omit for fixed/custom fees.
        minimumCharge:
          (pricingMethods.find((p) => p.id === draft.pricingMethodId)?.unit ?? null) !== null &&
          draft.minimumCharge.trim() !== ""
            ? Number(draft.minimumCharge)
            : undefined,
        startTime: startIso,
        endTime: endIso,
        actualHours: draft.actualHoursInput ? Number(draft.actualHoursInput) : calculatedHours,
        completedAcres: draft.completedAcres ? Number(draft.completedAcres) : undefined,
        fuelUsedLitres: draft.fuelUsedLitres ? Number(draft.fuelUsedLitres) : undefined,
        notes: draft.notes.trim() || undefined,
      });

      notifyDataRefresh("jobs");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to log completed job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "16px" }}>
        Enter field work details after completion when phones were not used. The system will calculate actual duration, pricing, and generate the invoice automatically.
      </div>

      {error && <div className="sa-form-error" style={{ marginBottom: "16px" }}> {error}</div>}

      {isLoadingOptions ? (
        <div className="sa-loading-state">Loading options…</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Farmer & Village Selection */}
          <div className="sa-form-row">
            <div className="sa-form-group" style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="sa-form-label" style={{ marginBottom: 0 }}>{customerTerm} *</label>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setDraft({ isCreatingFarmer: !draft.isCreatingFarmer })}
                >
                  {draft.isCreatingFarmer ? "Cancel" : `+ Quick New ${customerTerm}`}
                </button>
              </div>

              {draft.isCreatingFarmer ? (
                <div style={{ background: "var(--color-surface-secondary)", padding: "8px", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
                  <Input
                    label={`New ${customerTerm} Name`}
                    value={draft.newFarmerName}
                    onChange={(e) => setDraft({ newFarmerName: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                  <Input
                    label="Phone Number"
                    value={draft.newFarmerPhone}
                    onChange={(e) => setDraft({ newFarmerPhone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                  <Button variant="secondary" size="sm" type="button" onClick={handleQuickCreateFarmer}>
                    Save {customerTerm}
                  </Button>
                </div>
              ) : (
                <SearchableSelect
                  placeholder={`-- Select ${customerTerm} --`}
                  value={draft.customerId}
                  onChange={(v) => setDraft({ customerId: v })}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.phone ? ` (${c.phone})` : ""}`,
                  }))}
                />
              )}
            </div>

            <div className="sa-form-group" style={{ flex: 1 }}>
              <label className="sa-form-label">{villageTerm} *</label>
              <SearchableSelect
                placeholder={`-- Select ${villageTerm} --`}
                value={draft.villageId}
                onChange={(v) => setDraft({ villageId: v })}
                options={villages.map((v) => ({ value: v.id, label: v.name }))}
              />
            </div>
          </div>

          {/* Machine & Driver Selection */}
          <div className="sa-form-row">
            <div className="sa-form-group" style={{ flex: 1 }}>
              <label className="sa-form-label">{machineTerm} *</label>
              <SearchableSelect
                placeholder={`-- Select ${machineTerm} --`}
                value={draft.machineId}
                onChange={(v) => setDraft({ machineId: v })}
                options={machines.map((m) => ({
                  value: m.id,
                  label: `${m.registrationNumber} (${m.model || m.brand || "Equipment"})`,
                }))}
              />
            </div>

            <div className="sa-form-group" style={{ flex: 1 }}>
              <label className="sa-form-label">{driverTerm} *</label>
              <SearchableSelect
                placeholder={`-- Select ${driverTerm} --`}
                value={draft.driverId}
                onChange={(v) => setDraft({ driverId: v })}
                options={drivers.map((d) => ({ value: d.id, label: d.employee?.name || "Operator" }))}
              />
            </div>
          </div>

          {/* Work Date & Time Range */}
          <div className="sa-form-row">
            <Input
              label="Work Date *"
              type="date"
              value={draft.workDate}
              onChange={(e) => setDraft({ workDate: e.target.value })}
              required
            />
            <Input
              label="Start Time *"
              type="time"
              value={draft.startTimeStr}
              onChange={(e) => setDraft({ startTimeStr: e.target.value })}
              required
            />
            <Input
              label="End Time *"
              type="time"
              value={draft.endTimeStr}
              onChange={(e) => setDraft({ endTimeStr: e.target.value })}
              required
            />
          </div>

          {/* Duration Summary & Override */}
          <div style={{ background: "var(--color-primary-light)", padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Calculated Duration: </span>
              <strong style={{ fontSize: "1rem", color: "var(--color-primary-dark)" }}>{calculatedHours} hours</strong>
            </div>
            <div style={{ width: "160px" }}>
              <Input
                label="Override Hours"
                type="number"
                step="0.1"
                placeholder={String(calculatedHours)}
                value={draft.actualHoursInput}
                onChange={(e) => setDraft({ actualHoursInput: e.target.value })}
              />
            </div>
          </div>

          {/* Pricing Method & Rate */}
          <div className="sa-form-row">
            <div className="sa-form-group" style={{ flex: 1 }}>
              <label className="sa-form-label">Pricing Method *</label>
              <select
                className="sa-select"
                value={draft.pricingMethodId}
                onChange={(e) => setDraft({ pricingMethodId: e.target.value })}
                required
              >
                {pricingMethods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Rate (₹) *"
              type="number"
              value={draft.rate}
              onChange={(e) => setDraft({ rate: e.target.value })}
              required
            />
            {(pricingMethods.find((p) => p.id === draft.pricingMethodId)?.unit ?? null) !== null && (
              <Input
                label="Minimum Charge (₹)"
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional floor"
                value={draft.minimumCharge}
                onChange={(e) => setDraft({ minimumCharge: e.target.value })}
              />
            )}
          </div>
          {(pricingMethods.find((p) => p.id === draft.pricingMethodId)?.unit ?? null) !== null && (
            <p className="sa-input-hint">
              Minimum Charge is the lowest amount that will be billed — the final total is never below it,
              even if the metered amount is lower.
            </p>
          )}

          {/* Acres, Fuel & Notes */}
          <div className="sa-form-row">
            <Input
              label="Acres Worked"
              type="number"
              step="0.1"
              placeholder="e.g. 2.5"
              value={draft.completedAcres}
              onChange={(e) => setDraft({ completedAcres: e.target.value })}
            />
            <Input
              label="Fuel Used (Litres)"
              type="number"
              step="0.5"
              placeholder="e.g. 12"
              value={draft.fuelUsedLitres}
              onChange={(e) => setDraft({ fuelUsedLitres: e.target.value })}
            />
          </div>

          <Input
            label="Work Notes / Comments"
            type="text"
            placeholder="e.g. Paddy field harvesting completed smoothly"
            value={draft.notes}
            onChange={(e) => setDraft({ notes: e.target.value })}
          />

          <div className="sa-form-actions" style={{ marginTop: "20px" }}>
            <Button variant="secondary" type="button" onClick={onRequestClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging Work…" : "Log Completed Work & Generate Invoice"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
