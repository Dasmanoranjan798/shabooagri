import React, { useEffect, useState } from "react";
import type { CustomerOption, DriverOption, MachineOption, PricingMethodOption, VillageOption } from "../../types/booking";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface ManualJobEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualJobEntryModal: React.FC<ManualJobEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
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
  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTimeStr, setStartTimeStr] = useState<string>("08:00");
  const [endTimeStr, setEndTimeStr] = useState<string>("12:00");
  const [pricingMethodId, setPricingMethodId] = useState<string>("");
  const [rate, setRate] = useState<string>("500");
  const [actualHoursInput, setActualHoursInput] = useState<string>("");
  const [completedAcres, setCompletedAcres] = useState<string>("");
  const [fuelUsedLitres, setFuelUsedLitres] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Quick create farmer state
  const [isCreatingFarmer, setIsCreatingFarmer] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState("");
  const [newFarmerPhone, setNewFarmerPhone] = useState("");

  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

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

        if (pList.length > 0 && !pricingMethodId) {
          const perHour = pList.find((p) => p.key === "per_hour") || pList[0];
          setPricingMethodId(perHour.id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load form options");
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
  }, [isOpen]);

  // Compute calculated duration in hours from startTimeStr and endTimeStr
  const computeCalculatedHours = (): number => {
    if (!startTimeStr || !endTimeStr) return 0;
    const [sH, sM] = startTimeStr.split(":").map(Number);
    const [eH, eM] = endTimeStr.split(":").map(Number);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !villageId || !machineId || !driverId || !pricingMethodId) {
      setError("Please complete all required fields (Farmer, Village, Machine, Driver, Pricing Method).");
      return;
    }

    const startIso = `${workDate}T${startTimeStr}:00`;
    const endIso = `${workDate}T${endTimeStr}:00`;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createManualJob({
        customerId,
        villageId,
        machineId,
        driverId,
        scheduledDate: workDate,
        pricingMethodId,
        rate: Number(rate) || 0,
        startTime: startIso,
        endTime: endIso,
        actualHours: actualHoursInput ? Number(actualHoursInput) : calculatedHours,
        completedAcres: completedAcres ? Number(completedAcres) : undefined,
        fuelUsedLitres: fuelUsedLitres ? Number(fuelUsedLitres) : undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log completed job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📝 Log Completed Field Work (After-Work Entry)"
      maxWidth="680px"
    >
      <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "16px" }}>
        Enter field work details after completion when phones were not used. The system will calculate actual duration, pricing, and generate the invoice automatically.
      </div>

      {error && <div className="sa-form-error" style={{ marginBottom: "16px" }}>⚠ {error}</div>}

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
                  onClick={() => setIsCreatingFarmer(!isCreatingFarmer)}
                >
                  {isCreatingFarmer ? "Cancel" : `+ Quick New ${customerTerm}`}
                </button>
              </div>

              {isCreatingFarmer ? (
                <div style={{ background: "var(--color-surface-secondary)", padding: "8px", borderRadius: "6px", border: "1px solid var(--color-border)" }}>
                  <Input
                    label={`New ${customerTerm} Name`}
                    value={newFarmerName}
                    onChange={(e) => setNewFarmerName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                  <Input
                    label="Phone Number"
                    value={newFarmerPhone}
                    onChange={(e) => setNewFarmerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                  />
                  <Button variant="secondary" size="sm" type="button" onClick={handleQuickCreateFarmer}>
                    Save {customerTerm}
                  </Button>
                </div>
              ) : (
                <select
                  className="sa-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">Select {customerTerm}…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="sa-form-group" style={{ flex: 1 }}>
              <label className="sa-form-label">{villageTerm} *</label>
              <select
                className="sa-select"
                value={villageId}
                onChange={(e) => setVillageId(e.target.value)}
                required
              >
                <option value="">Select {villageTerm}…</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Machine & Driver Selection */}
          <div className="sa-form-row">
            <div className="sa-form-group" style={{ flex: 1 }}>
              <label className="sa-form-label">{machineTerm} *</label>
              <select
                className="sa-select"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                required
              >
                <option value="">Select {machineTerm}…</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.registrationNumber} ({m.model || m.brand || "Equipment"})
                  </option>
                ))}
              </select>
            </div>

            <div className="sa-form-group" style={{ flex: 1 }}>
              <label className="sa-form-label">{driverTerm} *</label>
              <select
                className="sa-select"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required
              >
                <option value="">Select {driverTerm}…</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.employee?.name || "Operator"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Work Date & Time Range */}
          <div className="sa-form-row">
            <Input
              label="Work Date *"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              required
            />
            <Input
              label="Start Time *"
              type="time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              required
            />
            <Input
              label="End Time *"
              type="time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
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
                value={actualHoursInput}
                onChange={(e) => setActualHoursInput(e.target.value)}
              />
            </div>
          </div>

          {/* Pricing Method & Rate */}
          <div className="sa-form-row">
            <div className="sa-form-group" style={{ flex: 1 }}>
              <label className="sa-form-label">Pricing Method *</label>
              <select
                className="sa-select"
                value={pricingMethodId}
                onChange={(e) => setPricingMethodId(e.target.value)}
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
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
          </div>

          {/* Acres, Fuel & Notes */}
          <div className="sa-form-row">
            <Input
              label="Acres Worked"
              type="number"
              step="0.1"
              placeholder="e.g. 2.5"
              value={completedAcres}
              onChange={(e) => setCompletedAcres(e.target.value)}
            />
            <Input
              label="Fuel Used (Litres)"
              type="number"
              step="0.5"
              placeholder="e.g. 12"
              value={fuelUsedLitres}
              onChange={(e) => setFuelUsedLitres(e.target.value)}
            />
          </div>

          <Input
            label="Work Notes / Comments"
            type="text"
            placeholder="e.g. Paddy field harvesting completed smoothly"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="sa-form-actions" style={{ marginTop: "20px" }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging Work…" : "✓ Log Completed Work & Generate Invoice"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
