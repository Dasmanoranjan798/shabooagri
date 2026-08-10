import React, { useEffect, useState, useCallback } from "react";
import "./driver-mobile.css";
import { Link } from "react-router-dom";
import type { Job } from "../../types/job";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";

function fmtDate(d: string) {
 return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
 weekday: "long",
 day: "numeric",
 month: "short",
 year: "numeric",
 });
}

function fmtTime(d: string | null) {
 if (!d) return "—";
 return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function statusLabel(s: Job["status"]): string {
 switch (s) {
 case "NOT_STARTED": return "Not Started";
 case "WORKING": return "Working";
 case "PAUSED": return "Paused";
 case "COMPLETED": return "Completed";
 default: return s;
 }
}

// Live elapsed timer helper
function useElapsedSec(startTime: string | null, pausedSec: number, active: boolean) {
 const [elapsed, setElapsed] = useState(0);
 useEffect(() => {
 if (!active || !startTime) { setElapsed(0); return; }
 const start = new Date(startTime).getTime();
 const tick = () => {
 const raw = Math.max(0, Math.floor((Date.now() - start) / 1000) - pausedSec);
 setElapsed(raw);
 };
 tick();
 const id = setInterval(tick, 5000);
 return () => clearInterval(id);
 }, [startTime, pausedSec, active]);
 return elapsed;
}

function fmtDuration(sec: number) {
 const h = Math.floor(sec / 3600);
 const m = Math.floor((sec % 3600) / 60);
 if (h > 0) return `${h}h ${m}m`;
 return `${m}m`;
}

interface JobCardProps {
 job: Job;
 onAction: () => void;
}

const TodayJobCard: React.FC<JobCardProps> = ({ job, onAction }) => {
 const [acting, setActing] = useState(false);
 const [err, setErr] = useState<string | null>(null);
 const elapsed = useElapsedSec(job.startTime, job.totalPausedDurationSec, job.status === "WORKING");

 const doAction = async (fn: () => Promise<Job>) => {
 setActing(true); setErr(null);
 try { await fn(); onAction(); }
 catch (e: any) { setErr(e.message || "Action failed"); }
 finally { setActing(false); }
 };

 const isToday = job.booking.scheduledDate === new Date().toISOString().slice(0, 10);
 const customer = job.booking.customer?.name ?? "—";
 const village = job.booking.customer?.village?.name ?? job.booking.village?.name ?? "—";

 return (
 <div className="sa-driver-job-card sa-driver-job-card--today">
 <div className="sa-driver-job-card-header">
 <div>
 <div className="sa-driver-job-customer">{customer}</div>
 <div className="sa-driver-job-village"> {village}</div>
 </div>
 <Badge variant={getStatusBadgeVariant(job.status)} size="md">
 {statusLabel(job.status)}
 </Badge>
 </div>

 <div className="sa-driver-job-meta-grid">
 <div className="sa-driver-job-meta-item">
 <div className="sa-driver-job-meta-label">Machine</div>
 <div className="sa-driver-job-meta-value">
 {job.machine.registrationNumber}
 {(job.machine.brand || job.machine.model) && (
 <div className="sa-driver-job-meta-sub">
 {[job.machine.brand, job.machine.model].filter(Boolean).join(" ")}
 </div>
 )}
 </div>
 </div>
 <div className="sa-driver-job-meta-item">
 <div className="sa-driver-job-meta-label">Date</div>
 <div className="sa-driver-job-meta-value">
 {isToday ? "Today" : fmtDate(job.booking.scheduledDate)}
 </div>
 </div>
 {job.startTime && (
 <div className="sa-driver-job-meta-item">
 <div className="sa-driver-job-meta-label">Start Time</div>
 <div className="sa-driver-job-meta-value">{fmtTime(job.startTime)}</div>
 </div>
 )}
 {job.status === "WORKING" && (
 <div className="sa-driver-job-meta-item">
 <div className="sa-driver-job-meta-label">Running</div>
 <div className="sa-driver-job-meta-value sa-driver-timer">{fmtDuration(elapsed)}</div>
 </div>
 )}
 {job.completedAcres != null && (
 <div className="sa-driver-job-meta-item">
 <div className="sa-driver-job-meta-label">Acres Done</div>
 <div className="sa-driver-job-meta-value">{job.completedAcres} ac</div>
 </div>
 )}
 {job.fuelUsedLitres != null && (
 <div className="sa-driver-job-meta-item">
 <div className="sa-driver-job-meta-label">Fuel Used</div>
 <div className="sa-driver-job-meta-value">{job.fuelUsedLitres} L</div>
 </div>
 )}
 </div>

 {err && <div className="sa-driver-job-err"> {err}</div>}

 <div className="sa-driver-job-actions">
 <a
 href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.booking.location || village)}`}
 target="_blank"
 rel="noopener noreferrer"
 className="sa-driver-action-btn"
 style={{
 backgroundColor: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 color: "#4f46e5",
 textDecoration: "none",
 }}
 >
 Navigate
 </a>
 {job.status === "NOT_STARTED" && (
 <button
 className="sa-driver-action-btn sa-driver-action-btn--start"
 onClick={() => doAction(() => api.startJob(job.id))}
 disabled={acting}
 >
 {acting ? <Spinner size="sm" /> : "▶ Start Job"}
 </button>
 )}
 {job.status === "WORKING" && (
 <>
 <button
 className="sa-driver-action-btn sa-driver-action-btn--pause"
 onClick={() => doAction(() => api.pauseJob(job.id))}
 disabled={acting}
 >
 {acting ? <Spinner size="sm" /> : "⏸ Pause"}
 </button>
 <button
 className="sa-driver-action-btn sa-driver-action-btn--complete"
 onClick={() => doAction(() => api.completeJob(job.id, {}))}
 disabled={acting}
 >
 {acting ? <Spinner size="sm" /> : "Complete"}
 </button>
 </>
 )}
 {job.status === "PAUSED" && (
 <>
 <button
 className="sa-driver-action-btn sa-driver-action-btn--start"
 onClick={() => doAction(() => api.resumeJob(job.id))}
 disabled={acting}
 >
 {acting ? <Spinner size="sm" /> : "▶ Resume"}
 </button>
 <button
 className="sa-driver-action-btn sa-driver-action-btn--complete"
 onClick={() => doAction(() => api.completeJob(job.id, {}))}
 disabled={acting}
 >
 {acting ? <Spinner size="sm" /> : "Complete"}
 </button>
 </>
 )}
 {job.status === "COMPLETED" && (
 <div className="sa-driver-job-done"> Job Completed</div>
 )}
 </div>
 </div>
 );
};

export const DriverHomePage: React.FC = () => {
 const { user } = useAuth();

 const [jobs, setJobs] = useState<Job[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const load = useCallback(async () => {
 setIsLoading(true);
 setError(null);
 try {
 const list = await api.listJobs();
 setJobs(list);
 } catch (e: any) {
 setError(e.message || "Failed to load jobs");
 } finally {
 setIsLoading(false);
 }
 }, []);

 useEffect(() => { load(); }, [load]);

 const today = new Date().toISOString().slice(0, 10);
 const todayJobs = jobs.filter((j) => j.booking.scheduledDate === today && j.status !== "COMPLETED");
 const activeJob = todayJobs.find((j) => j.status === "WORKING" || j.status === "PAUSED") ?? todayJobs[0] ?? null;
 const upcomingJobs = jobs.filter((j) => j.booking.scheduledDate > today);

 const dateStr = new Date().toLocaleDateString("en-IN", {
 weekday: "long", day: "numeric", month: "long", year: "numeric",
 });

 return (
 <div className="sa-driver-page">
 {/* Greeting */}
 <div className="sa-driver-greeting">
 <div>
 <div className="sa-driver-greeting-name">
 Hello, {user?.fullName?.split(" ")[0] ?? "Driver"} 
 </div>
 <div className="sa-driver-greeting-date">{dateStr}</div>
 </div>
 <div className="sa-driver-greeting-badge">Driver</div>
 </div>

 {isLoading ? (
 <div className="sa-loading-state"><Spinner /><span>Loading your jobs…</span></div>
 ) : error ? (
 <div className="sa-error-state"><p> {error}</p><button className="sa-btn sa-btn-secondary" onClick={load}>Retry</button></div>
 ) : (
 <>
 {/* Today's Job */}
 <div className="sa-driver-section-title">Today's Job</div>
 {activeJob ? (
 <TodayJobCard job={activeJob} onAction={load} />
 ) : (
 <div className="sa-driver-empty-card">
 <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}></div>
 <div style={{ fontWeight: 600, marginBottom: "4px" }}>No Active Job Today</div>
 <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>Check the Jobs tab for your schedule.</div>
 </div>
 )}

 {/* KPI row */}
 <div className="sa-driver-kpi-row">
 <div className="sa-driver-kpi-card">
 <div className="sa-driver-kpi-label">Today</div>
 <div className="sa-driver-kpi-value">{todayJobs.length}</div>
 </div>
 <div className="sa-driver-kpi-card">
 <div className="sa-driver-kpi-label">Upcoming</div>
 <div className="sa-driver-kpi-value">{upcomingJobs.length}</div>
 </div>
 <div className="sa-driver-kpi-card">
 <div className="sa-driver-kpi-label">Total</div>
 <div className="sa-driver-kpi-value">{jobs.length}</div>
 </div>
 </div>

 {/* All jobs shortcut */}
 <div style={{ display: "flex", justifyContent: "center", marginTop: "4px" }}>
 <Link to="/driver/jobs" className="sa-btn sa-btn-secondary" style={{ width: "100%", textAlign: "center" }}>
 View All Jobs →
 </Link>
 </div>
 </>
 )}
 </div>
 );
};
