import React, { useEffect, useState, useCallback } from "react";
import type { Booking } from "../../types/booking";
import type { Job } from "../../types/job";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, getStatusBadgeVariant, type BadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { getTerm } from "../../lib/terminology";
import { fmtCurrency, fmtDate } from "../../lib/format";
import { calculateAmount } from "../../lib/pricing";

// Badges/filters read the linked Job's status, not the old booking.status
// pipeline — a booking with no job yet started shows "Ready to Start" /
// "Awaiting Machine" (isReadyToStart), consistent with the Job Cards page.
const STATUS_FILTERS = [
 { label: "All", value: "ALL" },
 { label: "Active", value: "ACTIVE" },
 { label: "Awaiting", value: "AWAITING" },
 { label: "Done", value: "DONE" },
] as const;

type FilterKey = typeof STATUS_FILTERS[number]["value"];

function jobBadge(job: Job | undefined): { label: string; variant: BadgeVariant } {
 if (!job) return { label: "Pending", variant: "warning" };
 if (job.status === "NOT_STARTED") {
 return job.isReadyToStart
 ? { label: "Ready to Start", variant: "success" }
 : { label: "Awaiting Machine", variant: "warning" };
 }
 return { label: job.status.replace(/_/g, " "), variant: getStatusBadgeVariant(job.status) };
}

// Booking.estimatedAmount is dead weight now — bookings no longer collect
// estimatedHours/estimatedAcres at creation (pricing itself isn't even
// assigned until Start), so it's always null before a job finishes. Once
// the job IS complete, the real total can be computed from its actual
// worked hours/acres — same formula the Live Job screen's completion
// screen and the backend invoice both use.
function computeFinalAmount(booking: Booking, job: Job | undefined): number | null {
 if (!job || job.status !== "COMPLETED") return null;
 const pm = booking.pricingMethod;
 if (!pm || booking.rate == null) return null;
 const rate = booking.rate;
 if (pm.unit === null) return calculateAmount({ unit: null, rate, quantity: null });
 if (pm.unit === "hour") return job.actualHours != null ? calculateAmount({ unit: "hour", rate, quantity: job.actualHours }) : null;
 if (pm.unit === "minute") return job.actualHours != null ? calculateAmount({ unit: "minute", rate, quantity: job.actualHours * 60 }) : null;
 if (pm.unit === "acre") return job.completedAcres != null ? calculateAmount({ unit: "acre", rate, quantity: job.completedAcres }) : null;
 return null;
}

function matchesFilter(job: Job | undefined, filter: FilterKey): boolean {
 if (filter === "ALL") return true;
 if (!job) return filter === "AWAITING";
 if (filter === "AWAITING") return job.status === "NOT_STARTED";
 if (filter === "ACTIVE") return job.status === "WORKING" || job.status === "PAUSED" || job.status === "STOPPED";
 if (filter === "DONE") return job.status === "COMPLETED";
 return true;
}

export const FarmerBookingsPage: React.FC = () => {
 const bookingTerm = getTerm("booking", true);
 const villageTerm = getTerm("village");
 const machineTerm = getTerm("machine");
 const [bookings, setBookings] = useState<Booking[]>([]);
 const [jobs, setJobs] = useState<Job[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filter, setFilter] = useState<FilterKey>("ALL");
 const [expanded, setExpanded] = useState<string | null>(null);

 const load = useCallback(async () => {
 setIsLoading(true);
 setError(null);
 try {
 const [bList, jList] = await Promise.all([api.listBookings(), api.listJobs()]);
 setBookings(bList);
 setJobs(jList);
 } catch (e: any) {
 setError(e.message || "Failed to load bookings");
 } finally {
 setIsLoading(false);
 }
 }, []);

 useEffect(() => { load(); }, [load]);

 const jobsByBookingId = new Map(jobs.map((j) => [j.bookingId, j]));
 const filtered = bookings.filter((b) => matchesFilter(jobsByBookingId.get(b.id), filter));
 const sorted = [...filtered].sort(
 (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime(),
 );

 return (
 <div className="sa-portal-page">
 <div className="sa-portal-section-title">My {bookingTerm}</div>

 {/* Filter chips */}
 <div className="sa-portal-filter-row">
 {STATUS_FILTERS.map((opt) => (
 <button
 key={opt.value}
 className={`sa-portal-filter-btn ${filter === opt.value ? "is-active" : ""}`}
 onClick={() => setFilter(opt.value)}
 >
 {opt.label}
 </button>
 ))}
 </div>

 {isLoading ? (
 <div className="sa-loading-state"><Spinner /><span>Loading…</span></div>
 ) : error ? (
 <div className="sa-error-state"><p> {error}</p><Button variant="secondary" onClick={load}>Retry</Button></div>
 ) : sorted.length === 0 ? (
 <div className="sa-portal-empty-card">
 <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}></div>
 <div style={{ fontWeight: 600 }}>No {bookingTerm.toLowerCase()} found</div>
 </div>
 ) : (
 <div className="sa-portal-booking-list">
 {sorted.map((b) => (
 <div key={b.id} className="sa-portal-booking-card sa-portal-booking-card--expandable">
 {/* Card header — always visible */}
 <button
 className="sa-portal-booking-toggle"
 onClick={() => setExpanded(expanded === b.id ? null : b.id)}
 aria-expanded={expanded === b.id}
 >
 <div className="sa-portal-booking-header">
 <div>
 <div className="sa-portal-booking-number">{b.bookingNumber}</div>
 <div className="sa-portal-booking-date"> {fmtDate(b.scheduledDate)}</div>
 </div>
 <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
 <Badge variant={jobBadge(jobsByBookingId.get(b.id)).variant} size="sm">
 {jobBadge(jobsByBookingId.get(b.id)).label}
 </Badge>
 <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
 {expanded === b.id ? "▲" : "▼"}
 </span>
 </div>
 </div>
 </button>

 {/* Expanded detail */}
 {expanded === b.id && (
 <div className="sa-portal-booking-detail">
 <div className="sa-portal-detail-grid">
 {[
 { label: "Work Needed", value: b.workDescription ?? "—" },
 { label: villageTerm, value: b.village?.name ?? b.customer?.village?.name ?? "—" },
 { label: machineTerm, value: b.machine ? `${b.machine.registrationNumber}${b.machine.brand ? ` — ${b.machine.brand}` : ""}` : "Not assigned" },
 {
 label: "Pricing",
 value: b.pricingMethod ? `${b.pricingMethod.label}${b.pricingMethod.unit ? ` / ${b.pricingMethod.unit}` : ""}` : "Not set yet",
 },
 { label: "Rate", value: b.rate != null ? fmtCurrency(b.rate) : "Not set yet" },
 {
 label: "Total",
 value: (() => {
 const amount = computeFinalAmount(b, jobsByBookingId.get(b.id));
 return amount != null ? fmtCurrency(amount) : "Pending";
 })(),
 },
 ].map((item) => (
 <div key={item.label} className="sa-portal-detail-item">
 <div className="sa-portal-detail-label">{item.label}</div>
 <div className="sa-portal-detail-value">{item.value}</div>
 </div>
 ))}
 </div>
 {b.notes && (
 <div className="sa-portal-notes">
 <span style={{ fontWeight: 600 }}>Notes: </span>{b.notes}
 </div>
 )}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
};
