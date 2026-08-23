import { useEffect, useState } from "react";
import type { Job, JobFuelEntry, JobPhoto } from "../../types/job";
import type { PricingMethodOption } from "../../types/booking";
import type { CompanyProfile } from "../../types/settings";
import type { PricingUnit } from "../../lib/pricing";
import { calculateAmount } from "../../lib/pricing";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh, subscribeDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, useTaskTray, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Camera, Fuel, StickyNote, X } from "lucide-react";

// Migrated onto the shared task-tray system (Pass 2, Batch 3) — see
// BookingFormModal.tsx for the full explanation of the new contract. The
// quick-action sub-dialogs (Fuel/Photo/Note) and the new Stop/Submit/
// Resume-reason overlays are all inline sections toggled by
// `draft.activeSubDialog`, part of the SAME task — minimizing the Job
// Execution task and resuming it later brings back whichever overlay was
// open and whatever the user had half-typed into it, because that state
// lives in the task's draft, not local component state. The one exception
// is the picked photo File object (`photoFile`) — File instances can't be
// JSON-serialized into the draft/localStorage, so it's kept as local
// ephemeral state and is the one thing NOT preserved across a minimize
// while the photo sub-dialog is open; re-selecting the file after resume
// is an acceptable small gap, not a bug.
//
// Stage 5 rebuild (Booking -> Job Card -> Invoice flow): the old single
// "Complete Job" action is gone, replaced by Stop (freezes the clock,
// counter keeps ticking underneath the confirm dialog until Yes is
// pressed) followed by a separate Submit confirmation (the actual point of
// no return — generates the invoice, locks the job to Owner-only edits).
// Resuming from Paused now requires a reason first. Starting requires
// pricing to already be set on the booking — picked here, right before
// Start, not at booking time.

export interface JobExecutionInitProps {
  jobId: string;
  bookingNumber: string;
  // Owner-only (§ dependency-locked deletion, Rule 2 & 5) — defaults false
  // so any caller that hasn't been updated (e.g. the driver-facing surface)
  // never shows it; JobsPage always passes it explicitly.
  canCancel?: boolean;
}

type SubDialog = null | "fuel" | "photo" | "note" | "resumeReason" | "stopConfirm" | "submitConfirm";

export interface JobExecutionDraft {
  activeSubDialog: SubDialog;
  fuelLitres: string;
  fuelCost: string;
  photoCaption: string;
  noteText: string;
  resumeReason: string;
  submitAcres: string;
  pricingMethodId: string;
  pricingRate: string;
  pricingMinimum: string;
}

export function defaultJobExecutionDraft(): JobExecutionDraft {
  return {
    activeSubDialog: null,
    fuelLitres: "",
    fuelCost: "",
    photoCaption: "",
    noteText: "",
    resumeReason: "",
    submitAcres: "",
    pricingMethodId: "",
    pricingRate: "",
    pricingMinimum: "",
  };
}

const RESUME_REASON_QUICK_OPTIONS = ["Machine breakdown", "Lunch break", "Rain"];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Live ticking estimate while WORKING/PAUSED — mirrors the backend's
// calculateAmount, but only for the units a running clock can price
// (hour/minute/flat). Acre-priced jobs can't be estimated from elapsed
// time, so this returns null for those (the UI shows the rate instead).
function applyFloor(amount: number, minimumCharge: number | null | undefined): number {
  return minimumCharge != null && minimumCharge > amount ? round2(minimumCharge) : round2(amount);
}

function computeLiveAmount(unit: PricingUnit, rate: number, elapsedSec: number, minimumCharge: number | null): number | null {
  if (unit === null) return applyFloor(rate, minimumCharge);
  if (unit === "hour") return applyFloor(rate * (elapsedSec / 3600), minimumCharge);
  if (unit === "minute") return applyFloor(rate * (elapsedSec / 60), minimumCharge);
  return null;
}

// Final amount once actual values exist (STOPPED/COMPLETED) — same
// formula the backend's invoice generation uses, mirrored here so the
// completion screen's Total matches the invoice exactly.
function computeFinalAmount(job: Job): number | null {
  const pm = job.booking.pricingMethod;
  if (!pm || job.booking.rate == null) return null;
  const rate = job.booking.rate;
  const minimumCharge = job.booking.minimumCharge;
  if (pm.unit === null) return calculateAmount({ unit: null, rate, quantity: null, minimumCharge });
  if (pm.unit === "hour") return job.actualHours != null ? calculateAmount({ unit: "hour", rate, quantity: job.actualHours, minimumCharge }) : null;
  if (pm.unit === "minute") return job.actualHours != null ? calculateAmount({ unit: "minute", rate, quantity: job.actualHours * 60, minimumCharge }) : null;
  if (pm.unit === "acre") return job.completedAcres != null ? calculateAmount({ unit: "acre", rate, quantity: job.completedAcres, minimumCharge }) : null;
  return null;
}

function formatHms(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDurationWords(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

export const JobExecutionTask: TaskContentComponent<JobExecutionInitProps> = ({
  taskId,
  initProps,
  onRequestClose,
}) => {
  const { jobId, bookingNumber, canCancel = false } = initProps;
  const taskTray = useTaskTray();
  const [draft, setDraft] = useTaskDraft<JobExecutionDraft>(taskId, defaultJobExecutionDraft());

  const customerTerm = getTerm("customer");
  const villageTerm = getTerm("village");

  const [job, setJob] = useState<Job | null>(null);
  const [fuelEntries, setFuelEntries] = useState<JobFuelEntry[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [pricingMethods, setPricingMethods] = useState<PricingMethodOption[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadJob = async () => {
    try {
      const j = await api.getJobById(jobId);
      setJob(j);
      // Seed the note draft from the job the first time it loads — a live
      // draft.noteText the user is mid-typing must never be clobbered by a
      // background "jobs" refresh, so this only fires once (empty check).
      setDraft((prev) => (prev.noteText ? {} : { noteText: j.notes || "" }));
    } catch (err: any) {
      console.error("Failed to load job", err);
    }
  };

  // Initial load + sub-resources, once per task instance.
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        const [j, fList, pList, comp, pmList] = await Promise.all([
          api.getJobById(jobId),
          api.listJobFuelEntries(jobId),
          api.listJobPhotos(jobId),
          api.getCompanyProfile().catch(() => null),
          api.listPricingMethods().catch(() => []),
        ]);
        if (cancelled) return;
        setJob(j);
        setFuelEntries(fList);
        setPhotos(pList);
        setCompany(comp);
        setPricingMethods(pmList);
        setDraft((prev) => (prev.noteText ? {} : { noteText: j.notes || "" }));
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load job");
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stay in sync with other surfaces (e.g. the row list) changing this job.
  useEffect(() => subscribeDataRefresh("jobs", loadJob), [jobId]);

  // Calculate live running time every 1s while WORKING. Deliberately does
  // NOT special-case PAUSED — the interval simply stops updating elapsedSec
  // when status leaves WORKING, so the last value computed just before a
  // pause naturally stays frozen without a separate formula (and without
  // drifting from wall-clock time the way recomputing from Date.now()
  // during a pause would).
  useEffect(() => {
    if (!job || job.status !== "WORKING" || !job.startTime) {
      return;
    }

    const computeSec = () => {
      const startMs = new Date(job.startTime!).getTime();
      const nowMs = Date.now();
      const pausedMs = (job.totalPausedDurationSec || 0) * 1000;
      const rawSec = Math.max(0, Math.floor((nowMs - startMs - pausedMs) / 1000));
      setElapsedSec(rawSec);
    };

    computeSec();
    const interval = setInterval(computeSec, 1000);
    return () => clearInterval(interval);
  }, [job?.status, job?.startTime, job?.totalPausedDurationSec]);

  // Opens the same shared job-cancel-reason task JobsPage's row action
  // uses, rather than a second, separately maintained flow.
  const handleCancel = () => {
    taskTray.open({
      type: "job-cancel-reason",
      title: `Cancel Job — ${bookingNumber}`,
      initProps: { jobId },
      defaultDraft: { reason: "" },
    });
    onRequestClose();
  };

  if (!job) {
    return <div style={{ padding: "1.5rem" }}>{error || "Loading job…"}</div>;
  }

  // STOPPED/COMPLETED show the authoritative frozen duration from the
  // job record (actualHours) rather than the client's ticking estimate —
  // this is exactly what the invoice was/will be generated from.
  const displaySec =
    job.status === "STOPPED" || job.status === "COMPLETED"
      ? Math.round((job.actualHours || 0) * 3600)
      : elapsedSec;

  const pricingUnit = (job.booking.pricingMethod?.unit ?? null) as PricingUnit;
  const hasPricing = !!job.booking.pricingMethod && job.booking.rate != null;
  const liveAmount = hasPricing ? computeLiveAmount(pricingUnit, job.booking.rate!, displaySec, job.booking.minimumCharge) : null;
  const finalAmount = computeFinalAmount(job);

  const handleStart = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.startJob(job.id);
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to start job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.pauseJob(job.id);
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to pause job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmResume = async () => {
    if (!draft.resumeReason.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.resumeJob(job.id, draft.resumeReason.trim());
      setDraft({ activeSubDialog: null, resumeReason: "" });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to resume job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmStop = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.stopJob(job.id, {});
      setDraft({ activeSubDialog: null });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to stop job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: { completedAcres?: number } = {};
      if (pricingUnit === "acre") {
        payload.completedAcres = parseFloat(draft.submitAcres);
      }
      await api.submitJob(job.id, payload);
      setDraft({ activeSubDialog: null, submitAcres: "" });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to submit job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePricing = async () => {
    if (!draft.pricingMethodId || !draft.pricingRate) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Minimum charge only applies to metered methods; send null otherwise so
      // it never floors a fixed/custom fee.
      const selectedUnit = pricingMethods.find((p) => p.id === draft.pricingMethodId)?.unit ?? null;
      const minimum = selectedUnit !== null && draft.pricingMinimum.trim() !== "" ? parseFloat(draft.pricingMinimum) : null;
      await api.assignBookingPricing(job.bookingId, {
        pricingMethodId: draft.pricingMethodId,
        rate: parseFloat(draft.pricingRate),
        minimumCharge: minimum,
      });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to set pricing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.fuelLitres || parseFloat(draft.fuelLitres) <= 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.addJobFuelEntry(
        job.id,
        parseFloat(draft.fuelLitres),
        draft.fuelCost ? parseFloat(draft.fuelCost) : undefined
      );
      setDraft({ fuelLitres: "", fuelCost: "", activeSubDialog: null });

      const updatedEntries = await api.listJobFuelEntries(job.id);
      setFuelEntries(updatedEntries);
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to add fuel entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.uploadJobPhoto(job.id, photoFile, draft.photoCaption || undefined);
      setPhotoFile(null);
      setDraft({ photoCaption: "", activeSubDialog: null });

      const updatedPhotos = await api.listJobPhotos(job.id);
      setPhotos(updatedPhotos);
    } catch (err: any) {
      setError(err.message || "Failed to upload photo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.updateJobDetails(job.id, { notes: draft.noteText });
      setDraft({ activeSubDialog: null });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to save note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerName = job.booking.customer?.name || customerTerm;
  const villageName = job.booking.village?.name || job.booking.customer?.village?.name || villageTerm;
  const workOrMachine = job.booking.workDescription || job.machine?.registrationNumber || "Not assigned yet";
  const startedAtLabel = job.startTime
    ? new Date(job.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const renderStatusPill = () => {
    if (job.status === "WORKING") {
      return (
        <span className="sa-live-status-pill">
          <span className="sa-live-pulse-dot" />Working
        </span>
      );
    }
    if (job.status === "PAUSED") return <span className="sa-live-status-pill is-paused">Paused</span>;
    if (job.status === "STOPPED") return <span className="sa-live-status-pill is-stopped">Stopped</span>;
    if (job.status === "COMPLETED") return <Badge variant="success">Completed</Badge>;
    if (job.status === "CANCELLED") return <Badge variant="danger">Cancelled</Badge>;
    return <Badge variant="warning">Not Started</Badge>;
  };

  // Inline sub-dialog panel — replaces the old separate stacked <Modal>s.
  // Rendered as an overlay within this task's own content area so it
  // stays part of the same task (same minimize/resume, same z-index).
  const renderSubDialog = () => {
    if (draft.activeSubDialog === "fuel") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Add Fuel Entry</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleFuelSubmit} className="sa-booking-form">
              <Input
                label="Fuel Quantity (Litres) *"
                type="number"
                min="0.1"
                step="0.1"
                value={draft.fuelLitres}
                onChange={(e) => setDraft({ fuelLitres: e.target.value })}
                placeholder="e.g. 15.5"
                required
                autoFocus
              />
              <Input
                label="Total Cost (₹, Optional)"
                type="number"
                min="0"
                step="1"
                value={draft.fuelCost}
                onChange={(e) => setDraft({ fuelCost: e.target.value })}
                placeholder="e.g. 1400"
              />
              <div className="sa-form-actions">
                <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Save Fuel Log
                </Button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (draft.activeSubDialog === "photo") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Upload Job Photo</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handlePhotoSubmit} className="sa-booking-form">
              <div className="sa-input-group">
                <label className="sa-input-label">Select Image File *</label>
                <input
                  type="file"
                  accept="image/*"
                  className="sa-input"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <Input
                label="Caption / Description (Optional)"
                type="text"
                value={draft.photoCaption}
                onChange={(e) => setDraft({ photoCaption: e.target.value })}
                placeholder="e.g. Field condition before start"
              />
              <div className="sa-form-actions">
                <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!photoFile}>
                  Upload Photo
                </Button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (draft.activeSubDialog === "note") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Add Field Note</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleNoteSubmit} className="sa-booking-form">
              <div className="sa-input-group">
                <label className="sa-input-label">Note Content</label>
                <textarea
                  className="sa-input sa-textarea"
                  rows={3}
                  value={draft.noteText}
                  onChange={(e) => setDraft({ noteText: e.target.value })}
                  placeholder="Record field observations, soil state, or delays..."
                  autoFocus
                />
              </div>
              <div className="sa-form-actions">
                <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Save Note
                </Button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    // Reason is required before the counter is allowed to resume — quick
    // picks fill the same field a free-text edit would, so either path
    // ends up as one non-empty string logged to this resume's status log.
    if (draft.activeSubDialog === "resumeReason") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Why the delay?</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <div className="sa-resume-reason-chips">
              {RESUME_REASON_QUICK_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`sa-segmented-btn ${draft.resumeReason === opt ? "is-active" : ""}`}
                  onClick={() => setDraft({ resumeReason: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Input
              label="Reason to Resume *"
              value={draft.resumeReason}
              onChange={(e) => setDraft({ resumeReason: e.target.value })}
              placeholder="Or type a custom reason"
            />
            <div className="sa-form-actions">
              <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!draft.resumeReason.trim()}
                onClick={handleConfirmResume}
              >
                Confirm &amp; Resume
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (draft.activeSubDialog === "stopConfirm") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog sa-confirm-dialog is-warn">
            <div className="sa-confirm-icon">⚠️</div>
            <h3>Stop this job?</h3>
            <p>
              The work will be marked as finished. Make sure the machine has actually stopped working in the
              field.
            </p>
            <div className="sa-btn-row-half">
              <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                No, Continue
              </Button>
              <Button type="button" variant="warning" isLoading={isSubmitting} onClick={handleConfirmStop}>
                Yes, Stop
              </Button>
            </div>
            <div className="sa-confirm-stillrunning">⏱ Counter keeps running until you confirm</div>
          </div>
        </div>
      );
    }

    if (draft.activeSubDialog === "submitConfirm") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog sa-confirm-dialog is-danger">
            <div className="sa-confirm-icon">🔒</div>
            <h3>Submit this job?</h3>
            <p>
              Once submitted, this job <b>cannot be changed</b> by a Manager or Driver. Only the Owner can edit
              it after this point.
            </p>
            <div className="sa-btn-row-half">
              <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                No, Wait
              </Button>
              <Button type="button" variant="danger" isLoading={isSubmitting} onClick={handleConfirmSubmit}>
                Yes, Submit
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const missingPhoto = !!company?.requireJobPhoto && photos.length === 0;
  const missingFuel = !!company?.requireJobFuelLog && fuelEntries.length === 0;
  const missingAcres = pricingUnit === "acre" && !draft.submitAcres;

  return (
    <div className="sa-job-execution-body" style={{ padding: "1.5rem", position: "relative" }}>
      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        Booking {job.booking.bookingNumber}
      </div>

      {error && <div className="sa-alert sa-alert-danger">{error}</div>}

      {/* Header: Farmer + status pill, Village/machine/start-time meta */}
      <div className="sa-field-header-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>{customerName}</h3>
          {renderStatusPill()}
        </div>
        <span className="sa-field-sub">
          {villageName} · {workOrMachine}
          {startedAtLabel && job.status !== "NOT_STARTED" ? ` · Started ${startedAtLabel}` : ""}
        </span>
      </div>

      {/* Live / final counter */}
      {job.status !== "NOT_STARTED" && job.status !== "CANCELLED" && (
        <div className="sa-timer-left" style={{ width: "100%" }}>
          <span className="sa-timer-label">
            {job.status === "STOPPED" || job.status === "COMPLETED" ? "FINAL TIME — LOCKED" : "ELAPSED TIME"}
          </span>
          <div className="sa-timer-clock">{formatHms(displaySec)}</div>
        </div>
      )}

      {/* Live price display — Per Hour is the primary case; acre-priced
          jobs can't be estimated from a running clock, so they show the
          rate instead of a live-updating amount. */}
      {hasPricing && (job.status === "WORKING" || job.status === "PAUSED") && (
        <div className="sa-price-live">
          <div>
            <div className="sa-price-amt">
              {liveAmount != null ? formatCurrency(liveAmount) : formatCurrency(job.booking.rate!)}
            </div>
            <div className="sa-price-method">
              {job.booking.pricingMethod!.label}
              {pricingUnit ? ` · ${formatCurrency(job.booking.rate!)}/${pricingUnit}` : ""}
              {liveAmount != null ? " — updates live" : ""}
            </div>
          </div>
        </div>
      )}

      {/* Primary Field Action Bar */}
      <div className="sa-job-workflow-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.75rem" }}>
        {job.status === "NOT_STARTED" && (!job.machineId || !job.driverId) && (
          <div className="sa-alert sa-alert-info">
            This job still needs a machine and driver assigned — go back to Job Cards to assign them.
          </div>
        )}

        {job.status === "NOT_STARTED" && job.machineId && job.driverId && !hasPricing && (
          <div className="sa-input-group">
            <label className="sa-input-label">Set Pricing Before Starting *</label>
            <div className="sa-segmented-control">
              {pricingMethods.map((pm) => (
                <button
                  type="button"
                  key={pm.id}
                  className={`sa-segmented-btn ${draft.pricingMethodId === pm.id ? "is-active" : ""}`}
                  onClick={() => setDraft({ pricingMethodId: pm.id })}
                >
                  {pm.label}
                </button>
              ))}
            </div>
            <Input
              label="Rate (₹) *"
              type="number"
              min="0"
              step="0.01"
              value={draft.pricingRate}
              onChange={(e) => setDraft({ pricingRate: e.target.value })}
            />
            {(pricingMethods.find((p) => p.id === draft.pricingMethodId)?.unit ?? null) !== null && (
              <>
                <Input
                  label="Minimum Charge (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.pricingMinimum}
                  onChange={(e) => setDraft({ pricingMinimum: e.target.value })}
                />
                <p className="sa-input-hint">
                  Optional. The lowest amount that will be charged — the final total is never below this,
                  even if the metered amount works out lower.
                </p>
              </>
            )}
            <Button
              type="button"
              variant="primary"
              className="sa-action-main-btn"
              isLoading={isSubmitting}
              disabled={!draft.pricingMethodId || !draft.pricingRate}
              onClick={handleSavePricing}
            >
              Save Pricing
            </Button>
          </div>
        )}

        {job.status === "NOT_STARTED" && job.machineId && job.driverId && hasPricing && (
          <Button variant="primary" size="lg" className="sa-action-main-btn" isLoading={isSubmitting} onClick={handleStart}>
            ▶ Start Job
          </Button>
        )}

        {(job.status === "WORKING" || job.status === "PAUSED") && (
          <div className="sa-btn-row-half">
            <Button
              variant={job.status === "WORKING" ? "warning" : "primary"}
              size="lg"
              isLoading={isSubmitting}
              onClick={job.status === "WORKING" ? handlePause : () => setDraft({ activeSubDialog: "resumeReason" })}
            >
              {job.status === "WORKING" ? "⏸ Pause" : "▶ Start"}
            </Button>
            <Button
              variant="danger"
              size="lg"
              isLoading={isSubmitting}
              onClick={() => setDraft({ activeSubDialog: "stopConfirm" })}
            >
              ⏹ Stop
            </Button>
          </div>
        )}

        {job.status === "STOPPED" && (
          <>
            {pricingUnit === "acre" && (
              <Input
                label="Completed Acres *"
                type="number"
                min="0"
                step="0.1"
                value={draft.submitAcres}
                onChange={(e) => setDraft({ submitAcres: e.target.value })}
                placeholder="e.g. 4.5"
              />
            )}
            {missingPhoto && (
              <div className="sa-alert sa-alert-danger" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Camera size={16} /> A completion photo is required before submitting this job.
              </div>
            )}
            {missingFuel && (
              <div className="sa-alert sa-alert-danger" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Fuel size={16} /> A fuel-log entry is required before submitting this job.
              </div>
            )}
            <Button
              variant="danger"
              size="lg"
              className="sa-action-main-btn"
              isLoading={isSubmitting}
              disabled={missingPhoto || missingFuel || missingAcres}
              onClick={() => setDraft({ activeSubDialog: "submitConfirm" })}
            >
              Submit
            </Button>
          </>
        )}

        {job.status === "CANCELLED" && (
          <div className="sa-alert sa-alert-danger" style={{ textAlign: "center", width: "100%" }}>
            Job Cancelled
          </div>
        )}
      </div>

      {/* Completion screen */}
      {job.status === "COMPLETED" && (
        <div className="sa-field-info-grid">
          <div className="sa-finfo-item">
            <span className="sa-finfo-label">{customerTerm}</span>
            <span className="sa-finfo-val">{customerName}</span>
          </div>
          <div className="sa-finfo-item">
            <span className="sa-finfo-label">{villageTerm}</span>
            <span className="sa-finfo-val">{villageName}</span>
          </div>
          <div className="sa-finfo-item">
            <span className="sa-finfo-label">Duration</span>
            <span className="sa-finfo-val">{formatDurationWords(displaySec)}</span>
          </div>
          <div className="sa-finfo-item">
            <span className="sa-finfo-label">Rate</span>
            <span className="sa-finfo-val">
              {hasPricing ? `${formatCurrency(job.booking.rate!)}${pricingUnit ? `/${pricingUnit}` : ""}` : "—"}
            </span>
          </div>
          <div className="sa-finfo-item" style={{ gridColumn: "1 / -1" }}>
            <span className="sa-finfo-label">Total</span>
            <span className="sa-finfo-val sa-amount-bold">
              {finalAmount != null ? formatCurrency(finalAmount) : "—"}
            </span>
          </div>
        </div>
      )}
      {job.status === "COMPLETED" && (
        <div className="sa-notes-section">
          <p className="sa-notes-text" style={{ fontSize: "0.8rem" }}>
            This is now locked. Only the <b>Owner</b> can edit or void it — Manager/Driver view only from here.
          </p>
        </div>
      )}

      {canCancel && job.status !== "CANCELLED" && (
        <div style={{ marginTop: "0.25rem" }}>
          <Button variant="danger" size="sm" onClick={handleCancel}>
            Cancel Job
          </Button>
        </div>
      )}

      {/* Quick Action Icon Buttons */}
      {["WORKING", "PAUSED", "STOPPED"].includes(job.status) && (
        <div className="sa-quick-field-actions">
          <button className="sa-qaction-item" onClick={() => setDraft({ activeSubDialog: "fuel" })}>
            <span className="sa-qaction-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Fuel size={20} />
            </span>
            <span className="sa-qaction-label">+ Add Fuel</span>
          </button>

          <button className="sa-qaction-item" onClick={() => setDraft({ activeSubDialog: "photo" })}>
            <span className="sa-qaction-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={20} />
            </span>
            <span className="sa-qaction-label">+ Add Photo</span>
          </button>

          <button className="sa-qaction-item" onClick={() => setDraft({ activeSubDialog: "note" })}>
            <span className="sa-qaction-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <StickyNote size={20} />
            </span>
            <span className="sa-qaction-label">+ Add Note</span>
          </button>
        </div>
      )}

      {/* Field Notes Display */}
      {job.notes && (
        <div className="sa-notes-section">
          <h4>Field Notes</h4>
          <p className="sa-notes-text">{job.notes}</p>
        </div>
      )}

      {/* Fuel Logs Section */}
      {fuelEntries.length > 0 && (
        <div className="sa-fuel-logs-section">
          <h4>Fuel Log Entries ({fuelEntries.length})</h4>
          <div className="sa-fuel-list">
            {fuelEntries.map((fe) => (
              <div key={fe.id} className="sa-fuel-item">
                <span> {fe.litres} Litres</span>
                {fe.cost && <span className="sa-text-muted">{formatCurrency(fe.cost)}</span>}
                <span className="sa-fuel-time">
                  {new Date(fe.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos Grid Section */}
      {photos.length > 0 && (
        <div className="sa-photos-section">
          <h4>Job Photos ({photos.length})</h4>
          <div className="sa-attachment-grid">
            {photos.map((photo) => (
              <a key={photo.id} href={photo.fileUrl} target="_blank" rel="noreferrer" className="sa-attachment-item">
                <img src={photo.fileUrl} alt={photo.caption || "Job photo"} className="sa-attachment-img" />
              </a>
            ))}
          </div>
        </div>
      )}

      {renderSubDialog()}
    </div>
  );
};
