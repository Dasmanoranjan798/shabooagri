import { useEffect, useState } from "react";
import type { Job, JobFuelEntry, JobPhoto } from "../../types/job";
import type { CompanyProfile } from "../../types/settings";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh, subscribeDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, useTaskTray, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Camera, Fuel, Truck, StickyNote, X } from "lucide-react";

// Migrated onto the shared task-tray system (Pass 2, Batch 3) — see
// BookingFormModal.tsx for the full explanation of the new contract. The
// 4 quick-action sub-dialogs (Fuel/Photo/Note/Complete) that used to be
// separate <Modal> popups stacked on top of this one are now inline
// sections toggled by `draft.activeSubDialog`, part of the SAME task —
// this is what "travels together" means: minimizing the Job Execution
// task and resuming it later brings back whichever sub-dialog was open
// and whatever the user had half-typed into it, because that state lives
// in the task's draft, not local component state. The one exception is
// the picked photo File object (`photoFile`) — File instances can't be
// JSON-serialized into the draft/localStorage, so it's kept as local
// ephemeral state and is the one thing NOT preserved across a minimize
// while the photo sub-dialog is open; re-selecting the file after resume
// is an acceptable small gap, not a bug.

export interface JobExecutionInitProps {
  jobId: string;
  bookingNumber: string;
  // Owner-only (§ dependency-locked deletion, Rule 2 & 5) — defaults false
  // so any caller that hasn't been updated (e.g. the driver-facing surface)
  // never shows it; JobsPage always passes it explicitly.
  canCancel?: boolean;
}

type SubDialog = null | "fuel" | "photo" | "note" | "complete";

export interface JobExecutionDraft {
  activeSubDialog: SubDialog;
  fuelLitres: string;
  fuelCost: string;
  photoCaption: string;
  noteText: string;
  completeAcres: string;
  completeHours: string;
  completeNotes: string;
}

export function defaultJobExecutionDraft(): JobExecutionDraft {
  return {
    activeSubDialog: null,
    fuelLitres: "",
    fuelCost: "",
    photoCaption: "",
    noteText: "",
    completeAcres: "",
    completeHours: "",
    completeNotes: "",
  };
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
  const driverTerm = getTerm("driver");

  const [job, setJob] = useState<Job | null>(null);
  const [fuelEntries, setFuelEntries] = useState<JobFuelEntry[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
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
        const [j, fList, pList, comp] = await Promise.all([
          api.getJobById(jobId),
          api.listJobFuelEntries(jobId),
          api.listJobPhotos(jobId),
          api.getCompanyProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setJob(j);
        setFuelEntries(fList);
        setPhotos(pList);
        setCompany(comp);
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

  // Calculate live running time every 1s when WORKING
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

  // Format running time as HH:MM:SS or Xh Ym
  const formatRunningTime = (): string => {
    if (job.status === "NOT_STARTED") return "00:00:00";
    if (job.status === "COMPLETED") {
      if (job.actualHours != null) return `${job.actualHours} hrs`;
      return "Completed";
    }

    let sec = elapsedSec;
    if (job.status === "PAUSED" && job.startTime) {
      const startMs = new Date(job.startTime).getTime();
      const endMs = job.endTime ? new Date(job.endTime).getTime() : Date.now();
      const pausedMs = (job.totalPausedDurationSec || 0) * 1000;
      sec = Math.max(0, Math.floor((endMs - startMs - pausedMs) / 1000));
    }

    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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

  const handleResume = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.resumeJob(job.id);
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to resume job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.completeJob(job.id, {
        actualHours: draft.completeHours ? parseFloat(draft.completeHours) : undefined,
        completedAcres: draft.completeAcres ? parseFloat(draft.completeAcres) : undefined,
        notes: draft.completeNotes || undefined,
      });
      setDraft({ activeSubDialog: null });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to complete job");
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
  const machineReg = job.machine.registrationNumber;
  const driverName = job.driver.employee.name;

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

    if (draft.activeSubDialog === "complete") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Complete Job Execution</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCompleteSubmit} className="sa-booking-form">
              {company?.requireJobPhoto && photos.length === 0 && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: "6px", padding: "10px 12px", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Camera size={18} />
                  <span>A completion photo is required before completing this job. Please upload a photo first.</span>
                </div>
              )}
              {company?.requireJobFuelLog && fuelEntries.length === 0 && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: "6px", padding: "10px 12px", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Fuel size={18} />
                  <span>A fuel-log entry is required before completing this job. Please log fuel first.</span>
                </div>
              )}

              <Input
                label="Completed Acres"
                type="number"
                min="0"
                step="0.1"
                value={draft.completeAcres}
                onChange={(e) => setDraft({ completeAcres: e.target.value })}
                placeholder="e.g. 4.5"
              />
              <Input
                label="Manual Actual Hours (Optional override)"
                type="number"
                min="0"
                step="0.1"
                value={draft.completeHours}
                onChange={(e) => setDraft({ completeHours: e.target.value })}
                placeholder="Leave blank for auto-computed timer hours"
              />
              <div className="sa-input-group">
                <label className="sa-input-label">Final Completion Notes</label>
                <textarea
                  className="sa-input sa-textarea"
                  rows={2}
                  value={draft.completeNotes}
                  onChange={(e) => setDraft({ completeNotes: e.target.value })}
                  placeholder="Summary of work done..."
                />
              </div>
              <div className="sa-form-actions">
                <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isSubmitting}
                  disabled={
                    (!!company?.requireJobPhoto && photos.length === 0) ||
                    (!!company?.requireJobFuelLog && fuelEntries.length === 0)
                  }
                >
                  Confirm & Complete Job
                </Button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="sa-job-execution-body" style={{ padding: "1.5rem", position: "relative" }}>
      <div className="sa-modal-booking-title" style={{ marginBottom: "1rem" }}>
        <span>Job Execution #{job.booking.bookingNumber}</span>
        <Badge variant={getStatusBadgeVariant(job.status)}>{job.status.replace(/_/g, " ")}</Badge>
      </div>

      {error && <div className="sa-alert sa-alert-danger">{error}</div>}

      {/* §11.6 Header Banner: Machine + Customer + Village + Driver */}
      <div className="sa-field-header-card">
        <div className="sa-field-machine">
          <span className="sa-field-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Truck size={28} color="var(--color-primary)" />
          </span>
          <div>
            <h3>{machineReg}</h3>
            <span className="sa-field-sub">
              {job.machine.brand} {job.machine.model}
            </span>
          </div>
        </div>

        <div className="sa-field-info-grid">
          <div className="sa-finfo-item">
            <span className="sa-finfo-label"> {customerTerm}:</span>
            <span className="sa-finfo-val">{customerName}</span>
          </div>
          <div className="sa-finfo-item">
            <span className="sa-finfo-label"> Location:</span>
            <span className="sa-finfo-val">{villageName}</span>
          </div>
          <div className="sa-finfo-item">
            <span className="sa-finfo-label"> {driverTerm}:</span>
            <span className="sa-finfo-val">{driverName}</span>
          </div>
        </div>
      </div>

      {/* Live Running Time & Timer Card */}
      <div className="sa-timer-card">
        <div className="sa-timer-left">
          <span className="sa-timer-label">LIVE RUNNING TIME</span>
          <div className="sa-timer-clock">{formatRunningTime()}</div>
          {job.startTime && (
            <span className="sa-timer-start">
              Started at: {new Date(job.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div className="sa-timer-right">
          <div className="sa-stat-box">
            <span className="sa-stat-num">
              {job.fuelUsedLitres != null ? `${job.fuelUsedLitres} L` : "0 L"}
            </span>
            <span className="sa-stat-lbl">Fuel Consumed</span>
          </div>
          <div className="sa-stat-box">
            <span className="sa-stat-num">
              {job.completedAcres != null ? `${job.completedAcres} ac` : "0 ac"}
            </span>
            <span className="sa-stat-lbl">Acres Completed</span>
          </div>
        </div>
      </div>

      {/* Primary Field Action Bar (§11.6) */}
      <div className="sa-job-workflow-actions">
        {job.status === "NOT_STARTED" && (
          <Button variant="primary" size="lg" className="sa-action-main-btn" isLoading={isSubmitting} onClick={handleStart}>
            ▶ Start Job
          </Button>
        )}

        {job.status === "WORKING" && (
          <div className="sa-action-btn-group">
            <Button variant="warning" size="lg" isLoading={isSubmitting} onClick={handlePause}>
              ⏸ Pause Job
            </Button>
            <Button variant="success" size="lg" isLoading={isSubmitting} onClick={() => setDraft({ activeSubDialog: "complete" })}>
              Complete Job
            </Button>
          </div>
        )}

        {job.status === "PAUSED" && (
          <div className="sa-action-btn-group">
            <Button variant="primary" size="lg" isLoading={isSubmitting} onClick={handleResume}>
              ▶ Resume Job
            </Button>
            <Button variant="success" size="lg" isLoading={isSubmitting} onClick={() => setDraft({ activeSubDialog: "complete" })}>
              Complete Job
            </Button>
          </div>
        )}

        {job.status === "COMPLETED" && (
          <div className="sa-alert sa-alert-success" style={{ textAlign: "center", width: "100%" }}>
            Job Completed ({job.actualHours != null ? `${job.actualHours} hrs` : ""}
            {job.completedAcres != null ? ` • ${job.completedAcres} acres` : ""})
          </div>
        )}

        {job.status === "CANCELLED" && (
          <div className="sa-alert sa-alert-danger" style={{ textAlign: "center", width: "100%" }}>
            Job Cancelled
          </div>
        )}
      </div>

      {canCancel && job.status !== "CANCELLED" && (
        <div style={{ marginTop: "0.75rem" }}>
          <Button variant="danger" size="sm" onClick={handleCancel}>
            Cancel Job
          </Button>
        </div>
      )}

      {/* Quick Action Icon Buttons (§11.6) */}
      {job.status !== "COMPLETED" && (
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
