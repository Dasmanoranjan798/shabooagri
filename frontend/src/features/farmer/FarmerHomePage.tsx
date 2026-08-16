import React, { useEffect, useState, useCallback } from "react";
import "./farmer-mobile.css";
import { Link } from "react-router-dom";
import type { Booking } from "../../types/booking";
import type { Invoice } from "../../types/payment";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { getTerm } from "../../lib/terminology";

function fmtCurrency(val: number) {
 return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
 return new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", {
 day: "2-digit", month: "short", year: "numeric",
 });
}

function bookingStatusLabel(s: Booking["status"]) {
 return s.replace(/_/g, " ");
}

export const FarmerHomePage: React.FC = () => {
 const { user } = useAuth();
 const bookingTerm = getTerm("booking", true);

 const [bookings, setBookings] = useState<Booking[]>([]);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const load = useCallback(async () => {
 setIsLoading(true);
 setError(null);
 try {
 const [b, inv] = await Promise.all([api.listBookings(), api.listInvoices()]);
 setBookings(b);
 setInvoices(inv);
 } catch (e: any) {
 setError(e.message || "Failed to load data");
 } finally {
 setIsLoading(false);
 }
 }, []);

 useEffect(() => { load(); }, [load]);

 const dateStr = new Date().toLocaleDateString("en-IN", {
 weekday: "long", day: "numeric", month: "long", year: "numeric",
 });

 const activeBookings = bookings.filter(
 (b) => b.status !== "COMPLETED" && b.status !== "CANCELLED",
 );
 const pendingBalance = invoices.reduce((acc, inv) => acc + (inv.balanceAmount ?? 0), 0);
 const recentBookings = [...bookings]
 .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
 .slice(0, 3);

 return (
 <div className="sa-portal-page">
 {/* Greeting */}
 <div className="sa-portal-greeting">
 <div>
 <div className="sa-portal-greeting-name">
 Hello, {user?.fullName?.split(" ")[0] ?? "Farmer"} 
 </div>
 <div className="sa-portal-greeting-date">{dateStr}</div>
 </div>
 <div className="sa-portal-greeting-badge">Customer Portal</div>
 </div>

 {isLoading ? (
 <div className="sa-loading-state"><Spinner /><span>Loading your account…</span></div>
 ) : error ? (
 <div className="sa-error-state"><p> {error}</p><button className="sa-btn sa-btn-secondary" onClick={load}>Retry</button></div>
 ) : (
 <>
 {/* KPI cards */}
 <div className="sa-portal-kpi-row">
 <div className="sa-portal-kpi-card">
 <div className="sa-portal-kpi-label">Total {bookingTerm}</div>
 <div className="sa-portal-kpi-value">{bookings.length}</div>
 </div>
 <div className="sa-portal-kpi-card">
 <div className="sa-portal-kpi-label">Active</div>
 <div className="sa-portal-kpi-value">{activeBookings.length}</div>
 </div>
 <div className="sa-portal-kpi-card sa-portal-kpi-card--alert">
 <div className="sa-portal-kpi-label">Balance Due</div>
 <div className="sa-portal-kpi-value sa-portal-kpi-value--alert">
 {fmtCurrency(pendingBalance)}
 </div>
 </div>
 </div>

 {/* Recent bookings */}
 {recentBookings.length > 0 && (
 <>
 <div className="sa-portal-section-header">
 <span className="sa-portal-section-title">Recent {bookingTerm}</span>
 <Link to="/farmer/bookings" className="sa-portal-see-all">See all →</Link>
 </div>
 <div className="sa-portal-booking-list">
 {recentBookings.map((b) => (
 <div key={b.id} className="sa-portal-booking-card">
 <div className="sa-portal-booking-header">
 <span className="sa-portal-booking-number">{b.bookingNumber}</span>
 <Badge variant={getStatusBadgeVariant(b.status)} size="sm">
 {bookingStatusLabel(b.status)}
 </Badge>
 </div>
 <div className="sa-portal-booking-meta">
 <span> {fmtDate(b.scheduledDate)}</span>
 {b.machine && <span> {b.machine.registrationNumber}</span>}
 {b.estimatedAmount != null && <span> {fmtCurrency(b.estimatedAmount)}</span>}
 </div>
 </div>
 ))}
 </div>
 </>
 )}
 </>
 )}
 </div>
 );
};
