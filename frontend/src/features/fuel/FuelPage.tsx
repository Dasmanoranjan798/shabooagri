import React, { useEffect, useState, useMemo } from "react";
import { subscribeDataRefreshMany } from "../../lib/dataRefreshBus";
import { Fuel, AlertTriangle, FileSpreadsheet } from "lucide-react";
import "./fuel.css";
import type { FuelEntry } from "../../types/fuel";
import type { Machine } from "../../types/machine";
import { api } from "../../lib/api";
import { exportToExcel } from "../../lib/exportUtils";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";
import { getTerm } from "../../lib/terminology";
import { fmtCurrency, fmtDate as fmt } from "../../lib/format";

function fmtTime(date: string) {
 return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export const FuelPage: React.FC = () => {
 const machineTerm = getTerm("machine");

 const [entries, setEntries] = useState<FuelEntry[]>([]);
 const [machines, setMachines] = useState<Machine[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const [filterMachineId, setFilterMachineId] = useState<string>("");
 const [filterFrom, setFilterFrom] = useState<string>("");
 const [filterTo, setFilterTo] = useState<string>("");

 const loadData = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const [fuelList, machineList] = await Promise.all([
 api.listFuelEntries({
 machineId: filterMachineId || undefined,
 from: filterFrom || undefined,
 to: filterTo || undefined,
 }),
 api.listMachines(),
 ]);
 setEntries(fuelList);
 setMachines(machineList);
 } catch (err: any) {
 setError(err.message || "Failed to load fuel data");
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 return subscribeDataRefreshMany(["fuel"], loadData);
 }, []);

 const handleFilter = (e: React.FormEvent) => {
 e.preventDefault();
 loadData();
 };

 const totalLitres = useMemo(() => entries.reduce((acc, e) => acc + Number(e.litres), 0), [entries]);
 const totalCost = useMemo(() => entries.reduce((acc, e) => acc + (e.cost ? Number(e.cost) : 0), 0), [entries]);

 return (
 <div className="sa-fuel-page">
 <div className="sa-page-header">
 <div>
 <h1 className="sa-page-title"> Fuel Tracking</h1>
 <p className="sa-page-subtitle">All fuel entries logged across jobs and machines</p>
 </div>

 <Button
 variant="secondary"
 size="md"
 onClick={() => {
 const cols = [
 { header: "Date & Time", key: "dateTime" },
 { header: `${machineTerm}`, key: "machine" },
 { header: "Fuel Added (Litres)", key: "litres" },
 { header: "Total Cost", key: "cost" },
 { header: "Logged By", key: "loggedBy" },
 ];
 const dataRows = entries.map((e) => ({
 dateTime: `${fmt(e.recordedAt)} ${fmtTime(e.recordedAt)}`,
 machine: e.machine ? `${e.machine.registrationNumber} (${e.machine.brand || ""})` : "N/A",
 litres: e.litres,
 cost: e.cost || 0,
 loggedBy: e.recorder?.fullName || "Operator",
 }));
 exportToExcel("Fuel_Logs", "Fuel Entries", cols, dataRows);
 }}
 style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
 >
 <FileSpreadsheet size={16} /> Export Excel
 </Button>
 </div>

 {/* Filter bar */}
 <Card className="sa-filter-card">
 <form onSubmit={handleFilter} className="sa-filter-form">
 <div className="sa-form-group">
 <label className="sa-form-label">{machineTerm}</label>
 <SearchableSelect
 placeholder={`All ${getTerm("machine", true)}`}
 value={filterMachineId}
 onChange={setFilterMachineId}
 options={[
 { value: "", label: `All ${getTerm("machine", true)}` },
 ...machines.map((m) => ({
 value: m.id,
 label: `${m.registrationNumber} — ${m.brand ?? ""} ${m.model ?? ""}`,
 })),
 ]}
 />
 </div>

 <div className="sa-form-group">
 <label className="sa-form-label">From Date</label>
 <input
 type="date"
 className="sa-input"
 value={filterFrom}
 onChange={(e) => setFilterFrom(e.target.value)}
 />
 </div>

 <div className="sa-form-group">
 <label className="sa-form-label">To Date</label>
 <input
 type="date"
 className="sa-input"
 value={filterTo}
 onChange={(e) => setFilterTo(e.target.value)}
 />
 </div>

 <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
 <Button type="submit" variant="primary">Apply</Button>
 <Button
 type="button"
 variant="secondary"
 onClick={() => {
 setFilterMachineId("");
 setFilterFrom("");
 setFilterTo("");
 setTimeout(loadData, 0);
 }}
 >
 Clear
 </Button>
 </div>
 </form>
 </Card>

 {/* Summary KPIs */}
 {!isLoading && (
 <div className="sa-kpi-row" style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
 <div className="sa-kpi-card" style={{ flex: 1 }}>
 <div className="sa-kpi-label">Total Entries</div>
 <div className="sa-kpi-value">{entries.length}</div>
 </div>
 <div className="sa-kpi-card" style={{ flex: 1 }}>
 <div className="sa-kpi-label">Total Litres</div>
 <div className="sa-kpi-value">{totalLitres.toFixed(2)} L</div>
 </div>
 <div className="sa-kpi-card" style={{ flex: 1 }}>
 <div className="sa-kpi-label">Total Cost</div>
 <div className="sa-kpi-value">{fmtCurrency(totalCost)}</div>
 </div>
 </div>
 )}

 {/* Table */}
 {isLoading ? (
 <div className="sa-center-viewport">
 <Spinner size="lg" label="Loading fuel entries..." />
 </div>
 ) : error ? (
 <div className="sa-error-container">
 <div className="sa-error-card">
 <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <AlertTriangle size={32} color="var(--color-error, #D32F2F)" />
 </span>
 <h3>Error Loading Fuel Entries</h3>
 <p>{error}</p>
 <Button variant="primary" onClick={loadData}>Retry</Button>
 </div>
 </div>
 ) : entries.length === 0 ? (
 <Card>
 <div className="sa-empty-state">
 <div className="sa-empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <Fuel size={32} color="var(--color-text-muted)" />
 </div>
 <h3 className="sa-empty-title">No Fuel Entries Found</h3>
 <p className="sa-empty-desc">Fuel entries are logged during job execution. Use the Jobs screen to add fuel records.</p>
 </div>
 </Card>
 ) : (
 <Card title={`${entries.length} Entries`}>
 <div className="sa-table-responsive">
 <table className="sa-table">
 <thead>
 <tr>
 <th>{machineTerm}</th>
 <th>Date</th>
 <th>Time</th>
 <th>Litres</th>
 <th>Cost</th>
 <th>Recorded By</th>
 </tr>
 </thead>
 <tbody>
 {entries.map((entry) => (
 <tr key={entry.id}>
 <td>
 <strong>{entry.machine?.registrationNumber ?? "—"}</strong>
 {(entry.machine?.brand || entry.machine?.model) && (
 <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
 {[entry.machine.brand, entry.machine.model].filter(Boolean).join(" ")}
 </div>
 )}
 </td>
 <td>{fmt(entry.recordedAt)}</td>
 <td>{fmtTime(entry.recordedAt)}</td>
 <td>
 <Badge variant="info">{Number(entry.litres).toFixed(2)} L</Badge>
 </td>
 <td>{fmtCurrency(entry.cost)}</td>
 <td>{entry.recorder?.fullName ?? "—"}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )}
 </div>
 );
};
