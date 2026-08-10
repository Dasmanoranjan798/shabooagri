import React, { useEffect, useState } from "react";
import "./machines.css";
import type { Machine } from "../../types/machine";
import type { CompanyProfile } from "../../types/settings";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Wrench, ShieldAlert } from "lucide-react";
import { getMachineServiceWarning, getMachineInsuranceWarning } from "../../lib/operationalWarnings";
import { MachineFormModal } from "./MachineFormModal";
import { MachineDetailModal } from "./MachineDetailModal";

const MACHINE_STATUS_FILTERS: Array<{ label: string; value: string }> = [
 { label: "All", value: "ALL" },
 { label: "Available", value: "AVAILABLE" },
 { label: "Working", value: "WORKING" },
 { label: "Repair / Maint.", value: "REPAIR" },
 { label: "Offline", value: "OFFLINE" },
];

export const MachinesPage: React.FC = () => {
 const { roleKey, hasPermission } = useAuth();
 const machineTerm = getTerm("machine", true);
 const driverTerm = getTerm("driver");

 const [machines, setMachines] = useState<Machine[]>([]);
 const [company, setCompany] = useState<CompanyProfile | null>(null);
 const [activeFilter, setActiveFilter] = useState<string>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");

 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);

 const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
 const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

 const [selectedDetailMachine, setSelectedDetailMachine] = useState<Machine | null>(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

 const [deletingId, setDeletingId] = useState<string | null>(null);

 const canManage = roleKey === "owner" || hasPermission("machine.manage");

 const loadMachines = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const [list, comp] = await Promise.all([
 api.listMachines(),
 api.getCompanyProfile().catch(() => null),
 ]);
 setMachines(list);
 setCompany(comp);

 // Refresh detail modal if open
 if (selectedDetailMachine) {
 const updated = list.find((m) => m.id === selectedDetailMachine.id);
 if (updated) setSelectedDetailMachine(updated);
 }
 } catch (err: any) {
 setError(err.message || "Failed to load machines");
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadMachines();
 }, []);

 const handleOpenCreate = () => {
 setEditingMachine(null);
 setIsFormModalOpen(true);
 };

 const handleOpenEdit = (machine: Machine, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setEditingMachine(machine);
 setIsDetailModalOpen(false);
 setIsFormModalOpen(true);
 };

 const handleOpenDetail = (machine: Machine) => {
 setSelectedDetailMachine(machine);
 setIsDetailModalOpen(true);
 };

 const handleDelete = async (id: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 if (!window.confirm(`Are you sure you want to delete this ${getTerm("machine")}?`)) {
 return;
 }
 setDeletingId(id);
 try {
 await api.deleteMachine(id);
 setIsDetailModalOpen(false);
 loadMachines();
 } catch (err: any) {
 alert(err.message || "Failed to delete machine");
 } finally {
 setDeletingId(null);
 }
 };

 // Filter machines by status tab & search query
 const filteredMachines = machines.filter((m) => {
 if (activeFilter !== "ALL" && m.status !== activeFilter) return false;
 if (!searchQuery.trim()) return true;

 const q = searchQuery.toLowerCase();
 const reg = m.registrationNumber.toLowerCase();
 const brand = (m.brand || "").toLowerCase();
 const model = (m.model || "").toLowerCase();
 const typeName = (m.machineType?.name || "").toLowerCase();
 const driverName = (m.assignedDriver?.employee?.name || "").toLowerCase();

 return (
 reg.includes(q) ||
 brand.includes(q) ||
 model.includes(q) ||
 typeName.includes(q) ||
 driverName.includes(q)
 );
 });

 return (
 <div className="sa-machines-page">
 {/* Page Header */}
 <div className="sa-page-header">
 <div className="sa-page-header-text">
 <h2>{machineTerm} Fleet</h2>
 <p>Manage equipment inventory, hour meters, status & driver assignments</p>
 </div>

 {canManage && (
 <Button variant="primary" size="md" onClick={handleOpenCreate}>
 + Register {getTerm("machine")}
 </Button>
 )}
 </div>

 {/* Filter Tabs & Search Bar */}
 <div className="sa-toolbar">
 <div className="sa-filter-tabs">
 {MACHINE_STATUS_FILTERS.map((tab) => (
 <button
 key={tab.value}
 className={`sa-tab-btn ${activeFilter === tab.value ? "is-active" : ""}`}
 onClick={() => setActiveFilter(tab.value)}
 >
 {tab.label}
 {tab.value === "ALL" ? (
 <span className="sa-tab-count">({machines.length})</span>
 ) : (
 <span className="sa-tab-count">
 ({machines.filter((m) => m.status === tab.value).length})
 </span>
 )}
 </button>
 ))}
 </div>

 <div className="sa-toolbar-search">
 <input
 type="text"
 className="sa-input sa-search-input"
 placeholder={`Search by Reg #, Brand, Model, Type...`}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 {/* Main Content Area */}
 {isLoading ? (
 <div className="sa-center-viewport">
 <Spinner size="lg" label={`Loading ${machineTerm.toLowerCase()}...`} />
 </div>
 ) : error ? (
 <div className="sa-error-container">
 <div className="sa-error-card">
 <span className="sa-error-icon"></span>
 <h3>Error Loading Machines</h3>
 <p>{error}</p>
 <Button variant="primary" onClick={loadMachines}>
 Retry
 </Button>
 </div>
 </div>
 ) : filteredMachines.length === 0 ? (
 <Card>
 <div className="sa-empty-state">
 <span className="sa-empty-icon"></span>
 <h3>No {machineTerm} Found</h3>
 <p>
 {searchQuery || activeFilter !== "ALL"
 ? "No equipment records match the selected filter criteria."
 : `No ${machineTerm.toLowerCase()} registered in the fleet yet.`}
 </p>
 {canManage && (
 <Button variant="primary" size="md" onClick={handleOpenCreate} style={{ marginTop: "1rem" }}>
 + Register First {getTerm("machine")}
 </Button>
 )}
 </div>
 </Card>
 ) : (
 <>
 {/* Desktop Table View */}
 <div className="sa-desktop-only">
 <Card>
 <div className="sa-table-responsive">
 <table className="sa-table">
 <thead>
 <tr>
 <th>Registration #</th>
 <th>Type</th>
 <th>Brand & Model</th>
 <th>Fuel Type</th>
 <th>Status</th>
 <th>Hour Meter</th>
 <th>Assigned {driverTerm}</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredMachines.map((m) => (
 <tr
 key={m.id}
 onClick={() => handleOpenDetail(m)}
 className="sa-clickable-row"
 >
 <td className="sa-td-bold"> {m.registrationNumber}</td>
 <td>
 <div className="sa-cell-title">{m.machineType?.name || "Equipment"}</div>
 <div className="sa-cell-sub">{m.machineType?.category || ""}</div>
 </td>
 <td>
 <div className="sa-cell-title">{m.brand || "—"} {m.model || ""}</div>
 </td>
 <td>
 <Badge variant="neutral" size="sm">
 {m.fuelType}
 </Badge>
 </td>
 <td>
 <Badge variant={getStatusBadgeVariant(m.status)} size="sm">
 {m.status}
 </Badge>
 {(() => {
 const sWarn = getMachineServiceWarning(m, company);
 const iWarn = getMachineInsuranceWarning(m, company);
 if (!sWarn.hasWarning && !iWarn.hasWarning) return null;
 return (
 <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
 {sWarn.hasWarning && (
 <span style={{ background: sWarn.isOverdue ? "#fee2e2" : "#fef3c7", color: sWarn.isOverdue ? "#dc2626" : "#b45309", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
 <Wrench size={11} /> {sWarn.message}
 </span>
 )}
 {iWarn.hasWarning && (
 <span style={{ background: iWarn.isOverdue ? "#fee2e2" : "#fef3c7", color: iWarn.isOverdue ? "#dc2626" : "#b45309", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
 <ShieldAlert size={11} /> {iWarn.message}
 </span>
 )}
 </div>
 );
 })()}
 </td>
 <td>
 <div className="sa-cell-title">{m.hourMeterReading} hrs</div>
 {m.nextServiceDueHours != null && (
 <div className="sa-cell-sub">Due: {m.nextServiceDueHours} hrs</div>
 )}
 </td>
 <td>
 <div className="sa-cell-title">
 {m.assignedDriver?.employee?.name || <span className="sa-text-muted">Unassigned</span>}
 </div>
 </td>
 <td>
 <div className="sa-table-actions" onClick={(e) => e.stopPropagation()}>
 {canManage && (
 <button
 className="sa-icon-action"
 title="Edit Machine"
 onClick={(e) => handleOpenEdit(m, e)}
 >
 Edit
 </button>
 )}
 {canManage && (
 <button
 className="sa-icon-action"
 title="Delete Machine"
 disabled={deletingId === m.id}
 onClick={(e) => handleDelete(m.id, e)}
 >
 Delete
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 </div>

 {/* Mobile Card List View */}
 <div className="sa-mobile-only">
 <div className="sa-mobile-booking-list">
 {filteredMachines.map((m) => {
 const sWarn = getMachineServiceWarning(m, company);
 const iWarn = getMachineInsuranceWarning(m, company);
 return (
 <div
 key={m.id}
 className="sa-mobile-booking-card"
 onClick={() => handleOpenDetail(m)}
 >
 <div className="sa-booking-card-top">
 <div className="sa-booking-num">{m.registrationNumber}</div>
 <Badge variant={getStatusBadgeVariant(m.status)} size="sm">
 {m.status}
 </Badge>
 </div>

 {(sWarn.hasWarning || iWarn.hasWarning) && (
 <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "6px 0" }}>
 {sWarn.hasWarning && (
 <span style={{ background: sWarn.isOverdue ? "#fee2e2" : "#fef3c7", color: sWarn.isOverdue ? "#dc2626" : "#b45309", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
 <Wrench size={11} /> {sWarn.message}
 </span>
 )}
 {iWarn.hasWarning && (
 <span style={{ background: iWarn.isOverdue ? "#fee2e2" : "#fef3c7", color: iWarn.isOverdue ? "#dc2626" : "#b45309", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
 <ShieldAlert size={11} /> {iWarn.message}
 </span>
 )}
 </div>
 )}

 <div className="sa-booking-card-main">
 <div className="sa-bcard-row">
 <span className="sa-bcard-label">Equipment:</span>
 <span className="sa-bcard-val">
 {m.brand} {m.model || ""} ({m.machineType?.name})
 </span>
 </div>

 <div className="sa-bcard-row">
 <span className="sa-bcard-label">Meter:</span>
 <span className="sa-bcard-val sa-amount-bold" style={{ color: "#1b7a3e" }}>
 {m.hourMeterReading} hrs
 </span>
 </div>

 <div className="sa-bcard-row">
 <span className="sa-bcard-label">Default {driverTerm}:</span>
 <span className="sa-bcard-val">
 {m.assignedDriver?.employee?.name || "Unassigned"}
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </>
 )}

 {/* Form Modal (Create / Edit) */}
 <MachineFormModal
 isOpen={isFormModalOpen}
 onClose={() => setIsFormModalOpen(false)}
 onSuccess={loadMachines}
 machineToEdit={editingMachine}
 />

 {/* Detail Inspection Modal */}
 <MachineDetailModal
 isOpen={isDetailModalOpen}
 onClose={() => setIsDetailModalOpen(false)}
 machine={selectedDetailMachine}
 company={company}
 onEdit={(m) => handleOpenEdit(m)}
 onDelete={(id) => handleDelete(id)}
 />
 </div>
 );
};
