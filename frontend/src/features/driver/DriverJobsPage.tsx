import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { Job } from "../../types/job";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";

function statusLabel(s: Job["status"]): string {
  switch (s) {
    case "NOT_STARTED": return "Not Started";
    case "WORKING":     return "Working";
    case "PAUSED":      return "Paused";
    case "COMPLETED":   return "Completed";
    default:            return s;
  }
}

function fmtDate(d: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (d === today) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const FILTER_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Upcoming", value: "UPCOMING" },
  { label: "Done", value: "COMPLETED" },
] as const;

type FilterKey = typeof FILTER_OPTIONS[number]["value"];

export const DriverJobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setJobs(await api.listJobs());
    } catch (e: any) {
      setError(e.message || "Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = jobs.filter((j) => {
    if (filter === "ALL") return true;
    if (filter === "COMPLETED") return j.status === "COMPLETED";
    if (filter === "ACTIVE") return (j.status === "WORKING" || j.status === "PAUSED") || j.booking.scheduledDate === today;
    if (filter === "UPCOMING") return j.booking.scheduledDate > today && j.status === "NOT_STARTED";
    return true;
  });

  return (
    <div className="sa-driver-page">
      <div className="sa-driver-section-title">🚜 My Jobs</div>

      {/* Filter tabs */}
      <div className="sa-driver-filter-row">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`sa-driver-filter-btn ${filter === opt.value ? "is-active" : ""}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== "ALL" && (
              <span className="sa-driver-filter-count">
                {opt.value === "ACTIVE"
                  ? jobs.filter((j) => j.status === "WORKING" || j.status === "PAUSED" || j.booking.scheduledDate === today).length
                  : opt.value === "COMPLETED"
                  ? jobs.filter((j) => j.status === "COMPLETED").length
                  : jobs.filter((j) => j.booking.scheduledDate > today && j.status === "NOT_STARTED").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="sa-loading-state"><Spinner /><span>Loading jobs…</span></div>
      ) : error ? (
        <div className="sa-error-state"><p>⚠ {error}</p><button className="sa-btn sa-btn-secondary" onClick={load}>Retry</button></div>
      ) : filtered.length === 0 ? (
        <div className="sa-driver-empty-card">
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📭</div>
          <div style={{ fontWeight: 600 }}>No jobs in this view</div>
        </div>
      ) : (
        <div className="sa-driver-jobs-list">
          {filtered.map((job) => {
            const customer = job.booking.customer?.name ?? "Unknown";
            const village = job.booking.customer?.village?.name ?? job.booking.village?.name ?? "";
            return (
              <Link
                key={job.id}
                to={`/driver/jobs/${job.id}`}
                className="sa-driver-job-row"
              >
                <div className="sa-driver-job-row-info">
                  <div className="sa-driver-job-row-customer">{customer}</div>
                  <div className="sa-driver-job-row-sub">
                    📍 {village} &nbsp;·&nbsp; {fmtDate(job.booking.scheduledDate)}
                  </div>
                  <div className="sa-driver-job-row-machine">
                    🚜 {job.machine.registrationNumber}
                    {(job.machine.brand || job.machine.model) ? ` (${[job.machine.brand, job.machine.model].filter(Boolean).join(" ")})` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                  <Badge variant={getStatusBadgeVariant(job.status)} size="sm">{statusLabel(job.status)}</Badge>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
