import React, { useEffect, useState } from "react";
import "./maintenance.css";
import type { MaintenanceRecord, CreateMaintenanceRecordPayload, MaintenanceAlert } from "../../types/maintenance";
import type { Machine } from "../../types/machine";
import { Wrench, AlertTriangle, ShieldAlert } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { getTerm } from "../../lib/terminology";

function fmt(date: string) {
 return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
 day: "2-digit",
 month: "short",
 year: "numeric",
 });
}

function fmtCurrency(val?: number | null) {
 if (val == null) return "—";
 return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export const MaintenancePage: React.FC = () => {
 const machineTerm = getTerm("machine");
 const { roleKey, hasPermission } = useAuth();
 const canManage = roleKey === "owner" || hasPermission("maintenance.manage");

 const [records, setRecords] = useState<MaintenanceRecord[]>([]);
 const [machines, setMachines] = useState<Machine[]>([]);
 const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filterMachineId, setFilterMachineId] = useState<string>("");

 const [isFormOpen, setIsFormOpen] = useState(false);
 const [formLoading, setFormLoading] = useState(false);
 const [formError, setFormError] = useState<string | null>(null);
 const [deletingId, setDeletingId] = useState<string | null>(null);

 // Form state
 const [form, setForm] = useState<{
 machineId: string;
 serviceDate: string;
 hourMeterAtService: string;
 description: string;
 cost: string;
 performedBy: string;
 }>({
 machineId: "",
 serviceDate: new Date().toISOString().slice(0, 10),
 hourMeterAtService: "",
 description: "",
 cost: "",
 performedBy: "",
 });

 const loadData = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const [recList, machineList, alertList] = await Promise.all([
 api.listMaintenanceRecords(filterMachineId || undefined),
 api.listMachines(),
 api.listMaintenanceAlerts(),
 ]);
 setRecords(recList);
 setMachines(machineList);
 setAlerts(alertList);
 } catch (err: any) {
 setError(err.message || "Failed to load maintenance data");
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const handleFilterApply = () => loadData();

 const openForm = () => {
 setForm({
 machineId: machines[0]?.id ?? "",
 serviceDate: new Date().toISOString().slice(0, 10),
 hourMeterAtService: "",
 description: "",
 cost: "",
 performedBy: "",
 });
 setFormError(null);
 setIsFormOpen(true);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!form.machineId || !form.serviceDate) {
 setFormError("Machine and service date are required.");
 return;
 }
 setFormLoading(true);
 setFormError(null);
 try {
 const payload: CreateMaintenanceRecordPayload = {
 machineId: form.machineId,
 serviceDate: form.serviceDate,
 hourMeterAtService: form.hourMeterAtService ? Number(form.hourMeterAtService) : undefined,
 description: form.description.trim() || undefined,
 cost: form.cost ? Number(form.cost) : undefined,
 performedBy: form.performedBy.trim() || undefined,
 };
 await api.createMaintenanceRecord(payload);
 setIsFormOpen(false);
 await loadData();
 } catch (err: any) {
 setFormError(err.message || "Failed to log service record");
 } finally {
 setFormLoading(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm("Delete this maintenance record? This cannot be undone.")) return;
 setDeletingId(id);
 try {
 await api.deleteMaintenanceRecord(id);
 await loadData();
 } catch (err: any) {
 alert(err.message || "Failed to delete record");
 } finally {
 setDeletingId(null);
 }
 };

 return (
 <div className="sa-maintenance-page">
 <div className="sa-page-header">
 <div>
 <h1 className="sa-page-title"> Maintenance</h1>
 <p className="sa-page-subtitle">Service history and upcoming maintenance schedules</p>
 </div>
 {canManage && (
 <Button id="btn-log-service" onClick={openForm} variant="primary">
 + Log Service
 </Button>
 )}
 </div>

 {/* Filter */}
 <Card className="sa-filter-card">
 <div className="sa-filter-form">
 <div className="sa-form-group">
 <label className="sa-form-label">{machineTerm}</label>
 <select
 className="sa-select"
 value={filterMachineId}
 onChange={(e) => setFilterMachineId(e.target.value)}
 >
 <option value="">All {getTerm("machine", true)}</option>
 {machines.map((m) => (
 <option key={m.id} value={m.id}>
 {m.registrationNumber} — {m.brand ?? ""} {m.model ?? ""}
 </option>
 ))}
 </select>
 </div>
 <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
 <button className="sa-btn sa-btn-primary" onClick={handleFilterApply}>Apply</button>
 <button className="sa-btn sa-btn-secondary" onClick={() => { setFilterMachineId(""); setTimeout(loadData, 0); }}>Clear</button>
 </div>
 </div>
 </Card>

  {/* Alerts Section */}
  {alerts.length > 0 && !filterMachineId && (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontSize: "1.1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        <ShieldAlert size={20} color="var(--color-primary)" /> Equipment Maintenance Alerts
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
        {alerts.map((al) => (
          <div
            key={al.id}
            className="sa-card"
            style={{
              padding: "14px",
              backgroundColor: al.status === "OVERDUE" ? "#fef2f2" : al.status === "DUE_SOON" ? "#fffbe6" : "#f0fdf4",
              borderColor: al.status === "OVERDUE" ? "#fca5a5" : al.status === "DUE_SOON" ? "#fde68a" : "#bbf7d0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{al.machineRegistration}</span>
              <Badge variant={al.status === "OVERDUE" ? "danger" : al.status === "DUE_SOON" ? "warning" : "success"}>
                {al.status === "OVERDUE" ? "OVERDUE" : al.status === "DUE_SOON" ? "SERVICE DUE SOON" : "UP-TO-DATE"}
              </Badge>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", margin: "0 0 6px" }}>
              {al.description} ({al.machineBrandModel})
            </p>
            <div style={{ fontSize: "0.8rem", fontWeight: 500, color: al.status === "OVERDUE" ? "#dc2626" : al.status === "DUE_SOON" ? "#b45309" : "#15803d" }}>
              {al.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

 {/* Content */}
 {isLoading ? (
 <div className="sa-center-viewport">
 <Spinner size="lg" label="Loading maintenance records..." />
 </div>
 ) : error ? (
 <div className="sa-error-container">
 <div className="sa-error-card">
 <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <AlertTriangle size={32} color="var(--color-error, #D32F2F)" />
 </span>
 <h3>Error Loading Maintenance Records</h3>
 <p>{error}</p>
 <Button variant="primary" onClick={loadData}>Retry</Button>
 </div>
 </div>
 ) : records.length === 0 ? (
 <Card>
 <div className="sa-empty-state">
 <div className="sa-empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <Wrench size={32} color="var(--color-text-muted)" />
 </div>
 <h3 className="sa-empty-title">No Service Records</h3>
 <p className="sa-empty-desc">Log completed maintenance and service work to build a service history.</p>
 {canManage && (
 <Button variant="primary" onClick={openForm}>Log First Service</Button>
 )}
 </div>
 </Card>
 ) : (
 <Card title={`${records.length} Service Records`}>
 <div className="sa-table-responsive">
 <table className="sa-table">
 <thead>
 <tr>
 <th>{machineTerm}</th>
 <th>Service Date</th>
 <th>Hour Meter</th>
 <th>Description</th>
 <th>Cost</th>
 <th>Performed By</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {records.map((r) => (
 <tr key={r.id}>
 <td>
 <strong>{r.machine?.registrationNumber ?? "—"}</strong>
 {(r.machine?.brand || r.machine?.model) && (
 <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
 {[r.machine.brand, r.machine.model].filter(Boolean).join(" ")}
 </div>
 )}
 </td>
 <td>{fmt(r.serviceDate)}</td>
 <td>{r.hourMeterAtService != null ? `${r.hourMeterAtService} hrs` : "—"}</td>
 <td style={{ maxWidth: "200px" }}>{r.description ?? "—"}</td>
 <td>{fmtCurrency(r.cost)}</td>
 <td>{r.performedBy ?? "—"}</td>
 <td>
 {canManage && (
 <button
 className="sa-btn sa-btn-danger sa-btn-sm"
 onClick={() => handleDelete(r.id)}
 disabled={deletingId === r.id}
 >
 {deletingId === r.id ? "…" : "Delete"}
 </button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )}

 {/* Log Service Modal */}
 <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Service Record">
 <form onSubmit={handleSubmit} className="sa-form">
 {formError && <div className="sa-form-error">{formError}</div>}

 <div className="sa-form-group">
 <label className="sa-form-label">{machineTerm} *</label>
 <select
 className="sa-select"
 value={form.machineId}
 onChange={(e) => setForm((f) => ({ ...f, machineId: e.target.value }))}
 required
 >
 <option value="">Select {machineTerm}</option>
 {machines.map((m) => (
 <option key={m.id} value={m.id}>
 {m.registrationNumber} — {m.brand ?? ""} {m.model ?? ""}
 </option>
 ))}
 </select>
 </div>

 <div className="sa-form-group">
 <label className="sa-form-label">Service Date *</label>
 <input
 type="date"
 className="sa-input"
 value={form.serviceDate}
 onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))}
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
 value={form.hourMeterAtService}
 onChange={(e) => setForm((f) => ({ ...f, hourMeterAtService: e.target.value }))}
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
 value={form.cost}
 onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
 placeholder="0.00"
 />
 </div>
 </div>

 <div className="sa-form-group">
 <label className="sa-form-label">Description</label>
 <input
 type="text"
 className="sa-input"
 value={form.description}
 onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
 placeholder="e.g. Oil change, filter replacement"
 />
 </div>

 <div className="sa-form-group">
 <label className="sa-form-label">Performed By</label>
 <input
 type="text"
 className="sa-input"
 value={form.performedBy}
 onChange={(e) => setForm((f) => ({ ...f, performedBy: e.target.value }))}
 placeholder="Technician name or workshop"
 />
 </div>

 <div className="sa-form-actions">
 <Button variant="secondary" onClick={() => setIsFormOpen(false)} type="button">
 Cancel
 </Button>
 <Button variant="primary" type="submit" disabled={formLoading}>
 {formLoading ? "Saving…" : "Log Service"}
 </Button>
 </div>
 </form>
 </Modal>
 </div>
 );
};
