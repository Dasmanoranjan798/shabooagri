import { useState } from "react";
import type { CreateMaintenanceRecordPayload } from "../../types/maintenance";
import type { Machine } from "../../types/machine";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

// Migrated onto the shared task-tray system (Pass 2, Batch 3) — see
// BookingFormModal.tsx for the full explanation of the new contract.
// Previously an inline form living directly in MaintenancePage.tsx rather
// than its own component; extracted here so it can be a task like every
// other form. Always a create-only form (no edit mode), so no initProps
// beyond the machine option list are needed.

export interface MaintenanceLogInitProps {
  machines: Machine[];
}

export interface MaintenanceLogDraft {
  machineId: string;
  serviceDate: string;
  hourMeterAtService: string;
  description: string;
  cost: string;
  performedBy: string;
}

export function defaultMaintenanceLogDraft(machines: Machine[]): MaintenanceLogDraft {
  return {
    machineId: machines[0]?.id ?? "",
    serviceDate: new Date().toISOString().slice(0, 10),
    hourMeterAtService: "",
    description: "",
    cost: "",
    performedBy: "",
  };
}

export const MaintenanceLogTask: TaskContentComponent<MaintenanceLogInitProps> = ({
  taskId,
  initProps,
  onRequestClose,
}) => {
  const { machines } = initProps;
  const machineTerm = getTerm("machine");
  const [draft, setDraft] = useTaskDraft<MaintenanceLogDraft>(taskId, defaultMaintenanceLogDraft(machines));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.machineId || !draft.serviceDate) {
      setError("Machine and service date are required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateMaintenanceRecordPayload = {
        machineId: draft.machineId,
        serviceDate: draft.serviceDate,
        hourMeterAtService: draft.hourMeterAtService ? Number(draft.hourMeterAtService) : undefined,
        description: draft.description.trim() || undefined,
        cost: draft.cost ? Number(draft.cost) : undefined,
        performedBy: draft.performedBy.trim() || undefined,
      };
      await api.createMaintenanceRecord(payload);
      notifyDataRefresh("maintenance");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to log service record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sa-form" style={{ padding: "1.5rem" }}>
      {error && <div className="sa-form-error">{error}</div>}

      <div className="sa-form-group">
        <label className="sa-form-label">{machineTerm} *</label>
        <SearchableSelect
          placeholder={`Select ${machineTerm}`}
          value={draft.machineId}
          onChange={(val) => setDraft({ machineId: val })}
          options={machines.map((m) => ({
            value: m.id,
            label: `${m.registrationNumber} — ${m.brand ?? ""} ${m.model ?? ""}`,
          }))}
        />
      </div>

      <div className="sa-form-group">
        <label className="sa-form-label">Service Date *</label>
        <input
          type="date"
          className="sa-input"
          value={draft.serviceDate}
          onChange={(e) => setDraft({ serviceDate: e.target.value })}
          required
        />
      </div>

      <div className="sa-form-row">
        <div className="sa-form-group">
          <label className="sa-form-label">Hour Meter (hrs)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="sa-input"
            value={draft.hourMeterAtService}
            onChange={(e) => setDraft({ hourMeterAtService: e.target.value })}
            placeholder="e.g. 1250"
          />
        </div>
        <div className="sa-form-group">
          <label className="sa-form-label">Cost (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="sa-input"
            value={draft.cost}
            onChange={(e) => setDraft({ cost: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="sa-form-group">
        <label className="sa-form-label">Description</label>
        <input
          type="text"
          className="sa-input"
          value={draft.description}
          onChange={(e) => setDraft({ description: e.target.value })}
          placeholder="e.g. Oil change, filter replacement"
        />
      </div>

      <div className="sa-form-group">
        <label className="sa-form-label">Performed By</label>
        <input
          type="text"
          className="sa-input"
          value={draft.performedBy}
          onChange={(e) => setDraft({ performedBy: e.target.value })}
          placeholder="Technician name or workshop"
        />
      </div>

      <div className="sa-form-actions">
        <Button variant="secondary" onClick={onRequestClose} type="button">
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Log Service"}
        </Button>
      </div>
    </form>
  );
};
