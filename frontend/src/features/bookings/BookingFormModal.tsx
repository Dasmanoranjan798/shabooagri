import React, { useEffect, useState } from "react";
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
    if (!customerId) {
      setError(`Please select a ${customerTerm}`);
      return;
    }
    if (!villageId) {
      setError(`Please select a ${villageTerm}`);
      return;
    }
    if (!pricingMethodId) {
      setError("Please select a pricing method");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (bookingToEdit) {
        await api.updateBookingDetails(bookingToEdit.id, {
          customerId,
          villageId,
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
          customerId,
          villageId,
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
          <label className="sa-input-label">{customerTerm} *</label>
          <select
            className="sa-input"
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            required
          >
            <option value="">-- Select {customerTerm} --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.village ? `(${c.village.name})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Village */}
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

        {/* 3. Machine & 4. Driver Row */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <label className="sa-input-label">{machineTerm} (Optional)</label>
            <select
              className="sa-input"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
            >
              <option value="">-- Unassigned --</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.registrationNumber} {m.brand ? `(${m.brand})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="sa-input-group">
            <label className="sa-input-label">{driverTerm} (Optional)</label>
            <select
              className="sa-input"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">-- Unassigned --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.employee.name}
                </option>
              ))}
            </select>
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
