import React, { useEffect, useState } from "react";
import { AlertTriangle, Tractor } from "lucide-react";
import "./jobs.css";
import type { Job } from "../../types/job";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { JobExecutionModal } from "./JobExecutionModal";
import { ManualJobEntryModal } from "./ManualJobEntryModal";

const JOB_STATUS_FILTERS: Array<{ label: string; value: string }> = [
 { label: "All", value: "ALL" },
 { label: "Not Started", value: "NOT_STARTED" },
 { label: "Working", value: "WORKING" },
 { label: "Paused", value: "PAUSED" },
 { label: "Completed", value: "COMPLETED" },
];

export const JobsPage: React.FC = () => {
 const customerTerm = getTerm("customer");
 const villageTerm = getTerm("village");
 const machineTerm = getTerm("machine");
 const driverTerm = getTerm("driver");

 const [jobs, setJobs] = useState<Job[]>([]);
 const [activeFilter, setActiveFilter] = useState<string>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");

 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);

 const [selectedJob, setSelectedJob] = useState<Job | null>(null);
 const [isExecutionModalOpen, setIsExecutionModalOpen] = useState<boolean>(false);
 const [isManualEntryOpen, setIsManualEntryOpen] = useState<boolean>(false);

 const loadJobs = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const list = await api.listJobs();
 setJobs(list);

 // Refresh currently selected job if modal is open
 if (selectedJob) {
 const updated = list.find((j) => j.id === selectedJob.id);
 if (updated) setSelectedJob(updated);
 }
 } catch (err: any) {
 setError(err.message || "Failed to load jobs");
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadJobs();
 }, []);

 const handleOpenExecution = (job: Job) => {
 setSelectedJob(job);
 setIsExecutionModalOpen(true);
 };

 // Filter jobs by status tab & search query
 const filteredJobs = jobs.filter((j) => {
 if (activeFilter !== "ALL" && j.status !== activeFilter) return false;
 if (!searchQuery.trim()) return true;

 const q = searchQuery.toLowerCase();
 const cName = j.booking.customer?.name || "";
 const vName = j.booking.village?.name || j.booking.customer?.village?.name || "";
 const mReg = j.machine.registrationNumber;
 const dName = j.driver.employee.name;
 const bNum = j.booking.bookingNumber;

 return (
 bNum.toLowerCase().includes(q) ||
 cName.toLowerCase().includes(q) ||
 vName.toLowerCase().includes(q) ||
 mReg.toLowerCase().includes(q) ||
 dName.toLowerCase().includes(q)
 );
 });

 return (
 <div className="sa-jobs-page">
 {/* Page Header */}
 <div className="sa-page-header">
 <div className="sa-page-header-text">
 <h2>Jobs Execution</h2>
 <p>Live field operations, equipment tracking, fuel & progress logging</p>
 </div>
 <div className="sa-page-header-actions">
 <Button variant="primary" onClick={() => setIsManualEntryOpen(true)}>
 Log After-Work Entry
 </Button>
 </div>
 </div>

 {/* Filter Tabs & Search Bar */}
 <div className="sa-toolbar">
 <div className="sa-filter-tabs">
 {JOB_STATUS_FILTERS.map((tab) => (
 <button
 key={tab.value}
 className={`sa-tab-btn ${activeFilter === tab.value ? "is-active" : ""}`}
 onClick={() => setActiveFilter(tab.value)}
 >
 {tab.label}
 {tab.value === "ALL" ? (
 <span className="sa-tab-count">({jobs.length})</span>
 ) : (
 <span className="sa-tab-count">
 ({jobs.filter((j) => j.status === tab.value).length})
 </span>
 )}
 </button>
 ))}
 </div>

 <div className="sa-toolbar-search">
 <input
 type="text"
 className="sa-input sa-search-input"
 placeholder={`Search by #, ${customerTerm}, ${villageTerm}, ${machineTerm}...`}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 {/* Main Content Area */}
 {isLoading ? (
 <div className="sa-center-viewport">
 <Spinner size="lg" label="Loading execution jobs..." />
 </div>
 ) : error ? (
 <div className="sa-error-container">
 <div className="sa-error-card">
 <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <AlertTriangle size={32} color="var(--color-error, #D32F2F)" />
 </span>
 <h3>Error Loading Jobs</h3>
 <p>{error}</p>
 <Button variant="primary" onClick={loadJobs}>
 Retry
 </Button>
 </div>
 </div>
 ) : filteredJobs.length === 0 ? (
 <Card>
 <div className="sa-empty-state">
 <span className="sa-empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <Tractor size={32} color="var(--color-text-muted)" />
 </span>
 <h3>No Jobs Found</h3>
 <p>
 {searchQuery || activeFilter !== "ALL"
 ? "No job records match the selected filter criteria."
 : "No active dispatch jobs created yet. Jobs are automatically generated when a Booking transitions to 'On the way'."}
 </p>
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
 <th>Booking #</th>
 <th>{customerTerm} & {villageTerm}</th>
 <th>{machineTerm}</th>
 <th>{driverTerm}</th>
 <th>Status</th>
 <th>Hours / Acres</th>
 <th>Fuel Used</th>
 <th>Action</th>
 </tr>
 </thead>
 <tbody>
 {filteredJobs.map((j) => {
 const cName = j.booking.customer?.name || "Customer";
 const vName = j.booking.village?.name || j.booking.customer?.village?.name || "Village";
 return (
 <tr
 key={j.id}
 onClick={() => handleOpenExecution(j)}
 className="sa-clickable-row"
 >
 <td className="sa-td-bold">{j.booking.bookingNumber}</td>
 <td>
 <div className="sa-cell-title">{cName}</div>
 <div className="sa-cell-sub">{vName}</div>
 </td>
 <td>
 <div className="sa-cell-title">{j.machine.registrationNumber}</div>
 <div className="sa-cell-sub">
 {j.machine.brand} {j.machine.model}
 </div>
 </td>
 <td>
 <div className="sa-cell-title">{j.driver.employee.name}</div>
 </td>
 <td>
 <Badge variant={getStatusBadgeVariant(j.status)} size="sm">
 {j.status.replace(/_/g, " ")}
 </Badge>
 </td>
 <td>
 <div className="sa-cell-title">
 {j.actualHours != null ? `${j.actualHours} hrs` : "In Progress"}
 </div>
 {j.completedAcres != null && (
 <div className="sa-cell-sub">{j.completedAcres} acres</div>
 )}
 </td>
 <td>
 <span className="sa-td-bold" style={{ color: "#d97706" }}>
 {j.fuelUsedLitres != null ? `${j.fuelUsedLitres} L` : "0 L"}
 </span>
 </td>
 <td>
 <Button
 variant="outline"
 size="sm"
 onClick={(e) => {
 e.stopPropagation();
 handleOpenExecution(j);
 }}
 >
 Execute
 </Button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </Card>
 </div>

 {/* Mobile Card List View (§11.6) */}
 <div className="sa-mobile-only">
 <div className="sa-mobile-booking-list">
 {filteredJobs.map((j) => {
 const cName = j.booking.customer?.name || "Customer";
 const vName = j.booking.village?.name || j.booking.customer?.village?.name || "Village";
 return (
 <div
 key={j.id}
 className="sa-mobile-booking-card"
 onClick={() => handleOpenExecution(j)}
 >
 <div className="sa-booking-card-top">
 <div className="sa-booking-num"> {j.machine.registrationNumber}</div>
 <Badge variant={getStatusBadgeVariant(j.status)} size="sm">
 {j.status.replace(/_/g, " ")}
 </Badge>
 </div>

 <div className="sa-booking-card-main">
 <div className="sa-bcard-row">
 <span className="sa-bcard-label">Booking:</span>
 <span className="sa-bcard-val">{j.booking.bookingNumber}</span>
 </div>

 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> {customerTerm}:</span>
 <span className="sa-bcard-val">{cName} ({vName})</span>
 </div>

 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> {driverTerm}:</span>
 <span className="sa-bcard-val">{j.driver.employee.name}</span>
 </div>

 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> Fuel / Acres:</span>
 <span className="sa-bcard-val sa-amount-bold" style={{ color: "#1b7a3e" }}>
 {j.fuelUsedLitres != null ? `${j.fuelUsedLitres} L` : "0 L"}
 {j.completedAcres != null ? ` • ${j.completedAcres} ac` : ""}
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

 {/* Execution Modal */}
 <JobExecutionModal
 isOpen={isExecutionModalOpen}
 onClose={() => setIsExecutionModalOpen(false)}
 job={selectedJob}
 onUpdate={loadJobs}
 />

 {/* Manual After-Work Entry Modal */}
 <ManualJobEntryModal
 isOpen={isManualEntryOpen}
 onClose={() => setIsManualEntryOpen(false)}
 onSuccess={loadJobs}
 />
 </div>
 );
};
