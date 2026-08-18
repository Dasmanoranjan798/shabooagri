import React, { useEffect, useState } from "react";
import "../jobs/jobs.css";
import type { Job } from "../../types/job";
import type { PricingMethodOption } from "../../types/booking";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";

// Shared Stop/Submit/mandatory-resume-reason action bar for the Driver
// app — same underlying calls and confirmation guarantees as the Live Job
// screen (JobExecutionModal.tsx), just a simpler, non-task-tray UI since
// the Driver app isn't built on that system. Used by both DriverHomePage's
// TodayJobCard and DriverJobDetailPage so the two surfaces can't drift.

const RESUME_REASON_QUICK_OPTIONS = ["Machine breakdown", "Lunch break", "Rain"];

type Overlay = null | "resumeReason" | "stopConfirm" | "submitConfirm";

interface DriverJobActionsProps {
  job: Job;
  onUpdated: (job: Job) => void;
}

// gated by job.update_status on the backend specifically so a Driver can
// perform this step too, same as Manager/Owner via the Live Job screen.
const hasPricing = (job: Job) => !!job.booking.pricingMethod && job.booking.rate != null;

export const DriverJobActions: React.FC<DriverJobActionsProps> = ({ job, onUpdated }) => {
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [resumeReason, setResumeReason] = useState("");
  const [pricingMethods, setPricingMethods] = useState<PricingMethodOption[]>([]);
  const [pricingMethodId, setPricingMethodId] = useState("");
  const [pricingRate, setPricingRate] = useState("");

  const needsPricing = job.status === "NOT_STARTED" && !!job.machineId && !!job.driverId && !hasPricing(job);

  useEffect(() => {
    if (needsPricing && pricingMethods.length === 0) {
      api.listPricingMethods().then(setPricingMethods).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsPricing]);

  const doAction = async (fn: () => Promise<Job>) => {
    setActing(true);
    setErr(null);
    try {
      const updated = await fn();
      onUpdated(updated);
      setOverlay(null);
    } catch (e: any) {
      setErr(e.message || "Action failed");
    } finally {
      setActing(false);
    }
  };

  const handleSavePricing = async () => {
    if (!pricingMethodId || !pricingRate) return;
    setActing(true);
    setErr(null);
    try {
      await api.assignBookingPricing(job.bookingId, { pricingMethodId, rate: parseFloat(pricingRate) });
      onUpdated(await api.getJobById(job.id));
    } catch (e: any) {
      setErr(e.message || "Failed to set pricing");
    } finally {
      setActing(false);
    }
  };

  return (
    <>
      {err && <div className="sa-driver-job-err">⚠ {err}</div>}

      <div className="sa-driver-job-actions">
        {job.status === "NOT_STARTED" && (!job.machineId || !job.driverId) && (
          <div className="sa-driver-job-err" style={{ background: "none", color: "var(--color-text-muted)" }}>
            Waiting on a machine/driver assignment before this can start.
          </div>
        )}

        {needsPricing && (
          <div className="sa-input-group" style={{ width: "100%" }}>
            <label className="sa-input-label">Set Pricing Before Starting *</label>
            <div className="sa-segmented-control">
              {pricingMethods.map((pm) => (
                <button
                  type="button"
                  key={pm.id}
                  className={`sa-segmented-btn ${pricingMethodId === pm.id ? "is-active" : ""}`}
                  onClick={() => setPricingMethodId(pm.id)}
                >
                  {pm.label}
                </button>
              ))}
            </div>
            <input
              className="sa-input"
              type="number"
              min="0"
              step="0.01"
              value={pricingRate}
              onChange={(e) => setPricingRate(e.target.value)}
              placeholder="Rate (₹)"
              style={{ marginTop: "8px" }}
            />
            <button
              type="button"
              className="sa-driver-action-btn sa-driver-action-btn--start"
              style={{ width: "100%", marginTop: "8px" }}
              disabled={acting || !pricingMethodId || !pricingRate}
              onClick={handleSavePricing}
            >
              {acting ? <Spinner size="sm" /> : "Save Pricing"}
            </button>
          </div>
        )}

        {job.status === "NOT_STARTED" && job.machineId && job.driverId && hasPricing(job) && (
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
              onClick={() => setOverlay("stopConfirm")}
              disabled={acting}
            >
              ⏹ Stop
            </button>
          </>
        )}

        {job.status === "PAUSED" && (
          <>
            <button
              className="sa-driver-action-btn sa-driver-action-btn--start"
              onClick={() => { setResumeReason(""); setOverlay("resumeReason"); }}
              disabled={acting}
            >
              ▶ Start
            </button>
            <button
              className="sa-driver-action-btn sa-driver-action-btn--complete"
              onClick={() => setOverlay("stopConfirm")}
              disabled={acting}
            >
              ⏹ Stop
            </button>
          </>
        )}

        {job.status === "STOPPED" && (
          <button
            className="sa-driver-action-btn sa-driver-action-btn--complete"
            onClick={() => setOverlay("submitConfirm")}
            disabled={acting}
          >
            Submit
          </button>
        )}

        {job.status === "COMPLETED" && <div className="sa-driver-job-done">✅ Job Completed</div>}
      </div>

      {/* Reason is required before the counter is allowed to resume. */}
      {overlay === "resumeReason" && (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Why the delay?</h4>
              <button type="button" className="sa-icon-action" onClick={() => setOverlay(null)}>✕</button>
            </div>
            <div className="sa-resume-reason-chips">
              {RESUME_REASON_QUICK_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`sa-segmented-btn ${resumeReason === opt ? "is-active" : ""}`}
                  onClick={() => setResumeReason(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              className="sa-input"
              value={resumeReason}
              onChange={(e) => setResumeReason(e.target.value)}
              placeholder="Or type a custom reason"
              style={{ marginBottom: "12px" }}
              autoFocus
            />
            <div className="sa-form-actions">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setOverlay(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="sa-btn sa-btn-primary"
                disabled={!resumeReason.trim() || acting}
                onClick={() => doAction(() => api.resumeJob(job.id, resumeReason.trim()))}
              >
                {acting ? <Spinner size="sm" /> : "Confirm & Resume"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Counter keeps running underneath this — opening the overlay
          doesn't touch job state, only a confirmed "Yes, Stop" does. */}
      {overlay === "stopConfirm" && (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog sa-confirm-dialog is-warn">
            <div className="sa-confirm-icon">⚠️</div>
            <h3>Stop this job?</h3>
            <p>
              The work will be marked as finished. Make sure the machine has actually stopped working in the
              field.
            </p>
            <div className="sa-btn-row-half">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setOverlay(null)}>
                No, Continue
              </button>
              <button
                type="button"
                className="sa-btn"
                style={{ backgroundColor: "#d97706", borderColor: "#b45309", color: "#fff" }}
                disabled={acting}
                onClick={() => doAction(() => api.stopJob(job.id, {}))}
              >
                {acting ? <Spinner size="sm" /> : "Yes, Stop"}
              </button>
            </div>
            <div className="sa-confirm-stillrunning">⏱ Counter keeps running until you confirm</div>
          </div>
        </div>
      )}

      {overlay === "submitConfirm" && (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog sa-confirm-dialog is-danger">
            <div className="sa-confirm-icon">🔒</div>
            <h3>Submit this job?</h3>
            <p>
              Once submitted, this job <b>cannot be changed</b> by a Manager or Driver. Only the Owner can edit
              it after this point.
            </p>
            <div className="sa-btn-row-half">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setOverlay(null)}>
                No, Wait
              </button>
              <button
                type="button"
                className="sa-btn sa-btn-danger"
                disabled={acting}
                onClick={() => doAction(() => api.submitJob(job.id, {}))}
              >
                {acting ? <Spinner size="sm" /> : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
