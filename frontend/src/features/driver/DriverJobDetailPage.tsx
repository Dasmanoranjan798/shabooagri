import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Job } from "../../types/job";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";

function fmtDate(d: string) {
 return new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", {
 weekday: "long", day: "numeric", month: "long", year: "numeric",
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

function useElapsedSec(startTime: string | null, pausedSec: number, active: boolean) {
 const [elapsed, setElapsed] = useState(0);
 useEffect(() => {
 if (!active || !startTime) { setElapsed(0); return; }
 const start = new Date(startTime).getTime();
 const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000) - pausedSec));
 tick();
 const id = setInterval(tick, 1000);
 return () => clearInterval(id);
 }, [startTime, pausedSec, active]);
 return elapsed;
}

function fmtDuration(sec: number) {
 const h = Math.floor(sec / 3600);
 const m = Math.floor((sec % 3600) / 60);
 const s = sec % 60;
 if (h > 0) return `${h}h ${m}m`;
 if (m > 0) return `${m}m ${s}s`;
 return `${s}s`;
}

export const DriverJobDetailPage: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();

 const [job, setJob] = useState<Job | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [acting, setActing] = useState(false);
 const [actionErr, setActionErr] = useState<string | null>(null);

 const load = useCallback(async () => {
 if (!id) return;
 setIsLoading(true);
 setError(null);
 try {
 setJob(await api.getJobById(id));
 } catch (e: any) {
 setError(e.message || "Failed to load job");
 } finally {
 setIsLoading(false);
 }
 }, [id]);

 useEffect(() => { load(); }, [load]);

 const elapsed = useElapsedSec(
 job?.startTime ?? null,
 job?.totalPausedDurationSec ?? 0,
 job?.status === "WORKING",
 );

 const doAction = async (fn: () => Promise<Job>) => {
 setActing(true);
 setActionErr(null);
 try {
 const updated = await fn();
 setJob(updated);
 } catch (e: any) {
 setActionErr(e.message || "Action failed");
 } finally {
 setActing(false);
 }
 };

 if (isLoading) return <div className="sa-loading-state"><Spinner /><span>Loading job…</span></div>;
 if (error || !job) return (
 <div className="sa-driver-page">
 <div className="sa-error-state">
 <p> {error ?? "Job not found"}</p>
 <button className="sa-btn sa-btn-secondary" onClick={() => navigate("/driver/jobs")}>← Back</button>
 </div>
 </div>
 );

 const customer = job.booking.customer?.name ?? "—";
 const village = job.booking.customer?.village?.name ?? job.booking.village?.name ?? "—";

 return (
 <div className="sa-driver-page">
 {/* Back */}
 <button
 className="sa-driver-back-btn"
 onClick={() => navigate("/driver/jobs")}
 >
 ← Back to Jobs
 </button>

 {/* Status header */}
 <div className="sa-driver-detail-header">
 <div>
 <div className="sa-driver-job-customer" style={{ fontSize: "1.25rem" }}>{customer}</div>
 <div className="sa-driver-job-village"> {village}</div>
 </div>
 <Badge variant={getStatusBadgeVariant(job.status)} size="md">{statusLabel(job.status)}</Badge>
 </div>

 {/* Live timer */}
 {job.status === "WORKING" && (
 <div className="sa-driver-timer-card">
 <div className="sa-driver-timer-label">Running Time</div>
 <div className="sa-driver-timer-display">{fmtDuration(elapsed)}</div>
 </div>
 )}

 {/* Details grid */}
 <div className="sa-driver-detail-grid">
 {[
 { label: "Date", value: fmtDate(job.booking.scheduledDate) },
 { label: "Machine", value: `${job.machine.registrationNumber}${job.machine.brand ? ` — ${job.machine.brand}` : ""}` },
 { label: "Start Time", value: fmtTime(job.startTime) },
 { label: "End Time", value: fmtTime(job.endTime) },
 { label: "Acres Completed", value: job.completedAcres != null ? `${job.completedAcres} ac` : "—" },
 { label: "Fuel Used", value: job.fuelUsedLitres != null ? `${job.fuelUsedLitres} L` : "—" },
 { label: "Actual Hours", value: job.actualHours != null ? `${job.actualHours} hrs` : "—" },
 ].map((item) => (
 <div key={item.label} className="sa-driver-detail-item">
 <div className="sa-driver-detail-label">{item.label}</div>
 <div className="sa-driver-detail-value">{item.value}</div>
 </div>
 ))}
 </div>

 {job.notes && (
 <div className="sa-driver-notes-card">
 <div className="sa-driver-notes-label"> Notes</div>
 <div className="sa-driver-notes-text">{job.notes}</div>
 </div>
 )}

 {/* Actions */}
 {actionErr && <div className="sa-driver-job-err"> {actionErr}</div>}

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
 {acting ? <Spinner size="sm" /> : "Complete Job"}
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
 {acting ? <Spinner size="sm" /> : "Complete Job"}
 </button>
 </>
 )}
 {job.status === "COMPLETED" && (
 <div className="sa-driver-job-done" style={{ fontSize: "1.1rem", padding: "16px 0" }}>
 Job Completed
 </div>
 )}
 </div>
 </div>
 );
};
