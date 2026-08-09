import React, { useEffect, useState, useCallback } from "react";
import type { Booking, BookingStatus } from "../../types/booking";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { getTerm } from "../../lib/terminology";

function fmtDate(d: string) {
 return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
 day: "2-digit", month: "short", year: "numeric",
 });
}

function fmtCurrency(val: number | null | undefined) {
 if (val == null) return "—";
 return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const STATUS_FILTERS: { label: string; value: BookingStatus | "ALL" }[] = [
 { label: "All", value: "ALL" },
 { label: "Active", value: "WORKING" },
 { label: "Pending", value: "PENDING" },
 { label: "Done", value: "COMPLETED" },
];

export const FarmerBookingsPage: React.FC = () => {
 const bookingTerm = getTerm("booking", true);
 const [bookings, setBookings] = useState<Booking[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");
 const [expanded, setExpanded] = useState<string | null>(null);

 const load = useCallback(async () => {
 setIsLoading(true);
 setError(null);
 try {
 setBookings(await api.listBookings());
 } catch (e: any) {
 setError(e.message || "Failed to load bookings");
 } finally {
 setIsLoading(false);
 }
 }, []);

 useEffect(() => { load(); }, [load]);

 const filtered = bookings.filter((b) => filter === "ALL" || b.status === filter);
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
 <div className="sa-error-state"><p> {error}</p><button className="sa-btn sa-btn-secondary" onClick={load}>Retry</button></div>
 ) : sorted.length === 0 ? (
 <div className="sa-driver-empty-card">
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
 <Badge variant={getStatusBadgeVariant(b.status)} size="sm">
 {b.status.replace(/_/g, " ")}
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
 { label: "Village", value: b.village?.name ?? b.customer?.village?.name ?? "—" },
 { label: "Machine", value: b.machine ? `${b.machine.registrationNumber}${b.machine.brand ? ` — ${b.machine.brand}` : ""}` : "Not assigned" },
 { label: "Pricing", value: `${b.pricingMethod.label}${b.pricingMethod.unit ? ` / ${b.pricingMethod.unit}` : ""}` },
 { label: "Rate", value: fmtCurrency(b.rate) },
 { label: "Est. Amount", value: fmtCurrency(b.estimatedAmount) },
 { label: "Est. Hours", value: b.estimatedHours != null ? `${b.estimatedHours} hrs` : "—" },
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
