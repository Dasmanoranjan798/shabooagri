import React, { useEffect, useState } from "react";
import { AlertTriangle, Tractor, PlayCircle, XCircle } from "lucide-react";
import "./jobs.css";
import type { Job } from "../../types/job";
import type { Booking } from "../../types/booking";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { defaultJobExecutionDraft } from "./JobExecutionModal";
import { defaultManualJobEntryDraft } from "./ManualJobEntryModal";
import { useTaskTray } from "../../context/TaskTrayContext";
import { subscribeDataRefresh } from "../../lib/dataRefreshBus";
import { BookingDetailModal } from "../bookings/BookingDetailModal";

// Awaiting/Ready only apply to NOT_STARTED cards (derived from
// job.isReadyToStart, not job.status itself — see types/job.ts). Once a
// card has actually started, its real JobStatus badge takes over.
type CardFilter = "ALL" | "AWAITING_MACHINE" | "READY" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const CARD_FILTERS: Array<{ label: string; value: CardFilter }> = [
 { label: "All", value: "ALL" },
 { label: "Awaiting Machine", value: "AWAITING_MACHINE" },
 { label: "Ready to Start", value: "READY" },
 { label: "In Progress", value: "IN_PROGRESS" },
 { label: "Completed", value: "COMPLETED" },
 { label: "Cancelled", value: "CANCELLED" },
];

function matchesCardFilter(j: Job, filter: CardFilter): boolean {
 if (filter === "ALL") return true;
 if (filter === "AWAITING_MACHINE") return j.status === "NOT_STARTED" && !j.isReadyToStart;
 if (filter === "READY") return j.status === "NOT_STARTED" && !!j.isReadyToStart;
 if (filter === "IN_PROGRESS") return j.status === "WORKING" || j.status === "PAUSED" || j.status === "STOPPED";
 return j.status === filter;
}

// NOT_STARTED cards show the Ready to Start / Awaiting Machine badge
// (derived from isReadyToStart, not job.status — see types/job.ts);
// everything past that point shows its real JobStatus.
function renderCardBadge(j: Job) {
 if (j.status === "NOT_STARTED") {
 return j.isReadyToStart ? (
 <Badge variant="success" size="sm">Ready to Start</Badge>
 ) : (
 <Badge variant="warning" size="sm">Awaiting Machine</Badge>
 );
 }
 return (
 <Badge variant={getStatusBadgeVariant(j.status)} size="sm">
 {j.status.replace(/_/g, " ")}
 </Badge>
 );
}

export const JobsPage: React.FC = () => {
 const { roleKey, hasPermission } = useAuth();
 const customerTerm = getTerm("customer");
 const villageTerm = getTerm("village");
 const machineTerm = getTerm("machine");

 const [jobs, setJobs] = useState<Job[]>([]);
 const [activeFilter, setActiveFilter] = useState<CardFilter>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");

 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);

 // "Awaiting Machine" cards open the Booking's assignment UI (reusing
 // BookingDetailModal — it already has the machine/driver SearchableSelect
 // + Assign flow) instead of the Live Job screen, which isn't reachable
 // until a machine/driver exist.
 const [assignBooking, setAssignBooking] = useState<Booking | null>(null);
 const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);

 const taskTray = useTaskTray();

 // Owner-only (§ dependency-locked deletion, Rule 2 & 5) — blocked
 // server-side while a non-voided payment is linked to the job.
 const canCancel = roleKey === "owner" || hasPermission("job.cancel");

 const loadJobs = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const list = await api.listJobs();
 setJobs(list);
 } catch (err: any) {
 setError(err.message || "Failed to load jobs");
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadJobs();
 return subscribeDataRefresh("jobs", loadJobs);
 }, []);

 const handleOpenExecution = (job: Job) => {
 taskTray.open({
 type: "job-execution",
 title: `Job Card #${job.booking.bookingNumber}`,
 initProps: { jobId: job.id, bookingNumber: job.booking.bookingNumber, canCancel },
 defaultDraft: defaultJobExecutionDraft(),
 });
 };

 // A NOT_STARTED card with no machine/driver yet can't open the Live Job
 // screen (start() itself would reject it) — route to assignment instead.
 const handleOpenAssignment = async (job: Job) => {
 setError(null);
 try {
 const booking = await api.getBookingById(job.bookingId);
 setAssignBooking(booking);
 setIsAssignOpen(true);
 } catch (err: any) {
 setError(err.message || "Failed to load booking");
 }
 };

 // Refreshes both the jobs list (so the badge can flip to "Ready to
 // Start") and the modal's own booking prop (so it doesn't keep showing
 // the pre-assignment machine/driver once saved) — same pattern
 // BookingsPage uses for its own detail modal.
 const handleAssignmentUpdate = async () => {
 await loadJobs();
 if (assignBooking) {
 try {
 const refreshed = await api.getBookingById(assignBooking.id);
 setAssignBooking(refreshed);
 } catch {
 // Non-fatal — the jobs list still refreshed above.
 }
 }
 };

 const handleCardClick = (job: Job) => {
 if (job.status === "NOT_STARTED" && !job.isReadyToStart) {
 handleOpenAssignment(job);
 } else {
 handleOpenExecution(job);
 }
 };

 const handleOpenManualEntry = () => {
 taskTray.open({
 type: "manual-job-entry",
 title: "Log Completed Field Work",
 initProps: {},
 defaultDraft: defaultManualJobEntryDraft(),
 });
 };

 const handleCancel = (job: Job) => {
 taskTray.open({
 type: "job-cancel-reason",
 title: `Cancel Job — ${job.booking.bookingNumber}`,
 initProps: { jobId: job.id },
 defaultDraft: { reason: "" },
 });
 };

 // Filter jobs by card status tab & search query
 const filteredJobs = jobs.filter((j) => {
 if (!matchesCardFilter(j, activeFilter)) return false;
 if (!searchQuery.trim()) return true;

 const q = searchQuery.toLowerCase();
 const cName = j.booking.customer?.name || "";
 const vName = j.booking.village?.name || j.booking.customer?.village?.name || "";
 const mReg = j.machine?.registrationNumber || "";
 const dName = j.driver?.employee.name || "";
 const bNum = j.booking.bookingNumber;
 const work = j.booking.workDescription || "";

 return (
 bNum.toLowerCase().includes(q) ||
 cName.toLowerCase().includes(q) ||
 vName.toLowerCase().includes(q) ||
 mReg.toLowerCase().includes(q) ||
 dName.toLowerCase().includes(q) ||
 work.toLowerCase().includes(q)
 );
 });

 return (
 <div className="sa-jobs-page">
 {/* Page Header */}
 <div className="sa-page-header">
 <div className="sa-page-header-text">
 <h2>Job Cards</h2>
 <p>Live field operations, equipment tracking, fuel & progress logging</p>
 </div>
 <div className="sa-page-header-actions">
 <Button variant="primary" onClick={handleOpenManualEntry}>
 Log After-Work Entry
 </Button>
 </div>
 </div>

 {/* Filter Tabs & Search Bar */}
 <div className="sa-toolbar">
 <div className="sa-filter-tabs">
 {CARD_FILTERS.map((tab) => (
 <button
 key={tab.value}
 className={`sa-tab-btn ${activeFilter === tab.value ? "is-active" : ""}`}
 onClick={() => setActiveFilter(tab.value)}
 >
 {tab.label}
 <span className="sa-tab-count">
 ({tab.value === "ALL" ? jobs.length : jobs.filter((j) => matchesCardFilter(j, tab.value)).length})
 </span>
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
 <h3>No Job Cards Found</h3>
 <p>
 {searchQuery || activeFilter !== "ALL"
 ? "No job cards match the selected filter criteria."
 : "No Job Cards yet — saving a Booking creates one automatically."}
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
 <th>{customerTerm}</th>
 <th>{villageTerm}</th>
 <th>{machineTerm} / Work</th>
 <th>Status</th>
 <th>Action</th>
 </tr>
 </thead>
 <tbody>
 {filteredJobs.map((j) => {
 const cName = j.booking.customer?.name || customerTerm;
 const vName = j.booking.village?.name || j.booking.customer?.village?.name || villageTerm;
 const workOrMachine = j.booking.workDescription || j.machine?.registrationNumber || "No machine assigned yet";
 return (
 <tr
 key={j.id}
 onClick={() => handleCardClick(j)}
 className="sa-clickable-row"
 >
 <td className="sa-td-bold">{cName}</td>
 <td>{vName}</td>
 <td>
 <div className="sa-cell-title">{workOrMachine}</div>
 {j.machine && j.booking.workDescription && (
 <div className="sa-cell-sub">{j.machine.registrationNumber}</div>
 )}
 </td>
 <td>{renderCardBadge(j)}</td>
 <td>
 <div className="sa-table-actions" onClick={(e) => e.stopPropagation()}>
 <ActionMenu
 items={[
 { key: "execute", label: "Open", icon: <PlayCircle size={15} />, onClick: () => handleCardClick(j) },
 {
 key: "cancel",
 label: "Cancel Job",
 icon: <XCircle size={15} />,
 danger: true,
 onClick: () => handleCancel(j),
 hidden: !canCancel || j.status === "CANCELLED",
 },
 ]}
 />
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </Card>
 </div>

 {/* Mobile Card List View */}
 <div className="sa-mobile-only">
 <div className="sa-mobile-booking-list">
 {filteredJobs.map((j) => {
 const cName = j.booking.customer?.name || customerTerm;
 const vName = j.booking.village?.name || j.booking.customer?.village?.name || villageTerm;
 const workOrMachine = j.booking.workDescription || j.machine?.registrationNumber || "No machine assigned yet";
 return (
 <div
 key={j.id}
 className="sa-mobile-booking-card"
 onClick={() => handleCardClick(j)}
 >
 <div className="sa-booking-card-top">
 <div className="sa-booking-num">{cName}</div>
 {renderCardBadge(j)}
 </div>

 <div className="sa-booking-card-main">
 <div className="sa-bcard-row">
 <span className="sa-bcard-val">{vName} · {workOrMachine}</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </>
 )}

 <BookingDetailModal
 isOpen={isAssignOpen}
 onClose={() => setIsAssignOpen(false)}
 booking={assignBooking}
 onUpdate={handleAssignmentUpdate}
 />
 </div>
 );
};
