import { useEffect, useState } from "react";
import type { Job, JobFuelEntry, JobPhoto, JobWorkSession, JobAssignmentChange, JobTransportCharge, JobWorkSummary, TransportType } from "../../types/job";
import type { PricingMethodOption } from "../../types/booking";
import type { Machine } from "../../types/machine";
import type { Driver } from "../../types/driver";
import type { CompanyProfile } from "../../types/settings";
import type { PricingUnit } from "../../lib/pricing";
import { calculateAmount } from "../../lib/pricing";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh, subscribeDataRefresh } from "../../lib/dataRefreshBus";
import { useAuth } from "../../context/AuthContext";
import { useTaskDraft, useTaskTray, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Camera, Fuel, StickyNote, Truck, ArrowLeftRight, X } from "lucide-react";

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

type SubDialog =
  | null
  | "fuel"
  | "photo"
  | "note"
  | "resumeReason"
  | "pauseReason"
  | "changeMachine"
  | "changeDriver"
  | "transport"
  | "stopConfirm"
  | "submitConfirm";

export interface JobExecutionDraft {
  activeSubDialog: SubDialog;
  fuelLitres: string;
  fuelCost: string;
  photoCaption: string;
  noteText: string;
  resumeReason: string;
  pauseReason: string;
  changeMachineId: string;
  changeMachineReason: string;
  changeDriverId: string;
  changeDriverReason: string;
  transportTypeId: string;
  transportTrips: string;
  transportRate: string;
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
    pauseReason: "",
    changeMachineId: "",
    changeMachineReason: "",
    changeDriverId: "",
    changeDriverReason: "",
    transportTypeId: "",
    transportTrips: "",
    transportRate: "",
    submitAcres: "",
    pricingMethodId: "",
    pricingRate: "",
    pricingMinimum: "",
  };
}

const RESUME_REASON_QUICK_OPTIONS = ["Machine breakdown", "Lunch break", "Rain"];
// Reason quick-picks (Parts 6-8). "Other" is just free text — whatever the
// user types is stored; the backend only requires a non-empty reason.
const PAUSE_REASON_QUICK_OPTIONS = [
  "Customer requested pause",
  "Weather",
  "Machine issue",
  "Driver issue",
  "Field/access problem",
  "Waiting for customer",
  "Work postponed",
];
const MACHINE_CHANGE_REASON_OPTIONS = [
  "Machine breakdown",
  "Machine unavailable",
  "Maintenance",
  "Machine reassigned",
  "Customer requested machine change",
  "Emergency",
];
const DRIVER_CHANGE_REASON_OPTIONS = [
  "Driver unavailable",
  "Driver reassigned",
  "Driver illness",
  "Customer requested driver change",
  "Emergency",
];

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
  const { roleKey, hasPermission } = useAuth();
  // Machine/Driver reassignment is an authorised Manager/Owner action (backend
  // gates on machine.assign / driver.assign). Hide the controls otherwise so
  // the UI never implies an operation the backend will reject.
  const canManageAssignments =
    roleKey === "owner" || hasPermission("machine.assign") || hasPermission("driver.assign");
  const [draft, setDraft] = useTaskDraft<JobExecutionDraft>(taskId, defaultJobExecutionDraft());

  const customerTerm = getTerm("customer");
  const villageTerm = getTerm("village");

  const [job, setJob] = useState<Job | null>(null);
  const [fuelEntries, setFuelEntries] = useState<JobFuelEntry[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [pricingMethods, setPricingMethods] = useState<PricingMethodOption[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  // Job Execution V2 data — all read from the authoritative backend.
  const [machines, setMachines] = useState<Machine[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [transportTypes, setTransportTypes] = useState<TransportType[]>([]);
  const [transportCharges, setTransportCharges] = useState<JobTransportCharge[]>([]);
  const [workSessions, setWorkSessions] = useState<JobWorkSession[]>([]);
  const [assignmentChanges, setAssignmentChanges] = useState<JobAssignmentChange[]>([]);
  // Authoritative per-driver / per-machine worked-time rollup (Parts 15, 30),
  // served by GET /jobs/:id/work-summary. Rendered on STOPPED/COMPLETED jobs.
  const [workSummary, setWorkSummary] = useState<JobWorkSummary | null>(null);

  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Work-session history, assignment-change audit, and transport charges — the
  // Job Timeline and final breakdown are built ENTIRELY from these authoritative
  // records, never reconstructed from the job's current machine/driver.
  const loadExecutionHistory = async () => {
    try {
      const [sessions, changes, charges, summary] = await Promise.all([
        api.listJobWorkSessions(jobId).catch(() => []),
        api.listJobAssignmentChanges(jobId).catch(() => []),
        api.listJobTransportCharges(jobId).catch(() => []),
        api.getJobWorkSummary(jobId).catch(() => null),
      ]);
      setWorkSessions(sessions);
      setAssignmentChanges(changes);
      setTransportCharges(charges);
      setWorkSummary(summary);
    } catch {
      /* non-fatal: the timeline just stays empty */
    }
  };

  const loadJob = async () => {
    try {
      const j = await api.getJobById(jobId);
      setJob(j);
      // Seed the note draft from the job the first time it loads — a live
      // draft.noteText the user is mid-typing must never be clobbered by a
      // background "jobs" refresh, so this only fires once (empty check).
      setDraft((prev) => (prev.noteText ? {} : { noteText: j.notes || "" }));
      await loadExecutionHistory();
    } catch (err: any) {
      console.error("Failed to load job", err);
    }
  };

  // Initial load + sub-resources, once per task instance.
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        const [j, fList, pList, comp, pmList, mList, dList, ttList] = await Promise.all([
          api.getJobById(jobId),
          api.listJobFuelEntries(jobId),
          api.listJobPhotos(jobId),
          api.getCompanyProfile().catch(() => null),
          api.listPricingMethods().catch(() => []),
          api.listMachines().catch(() => []),
          api.listDrivers().catch(() => []),
          api.listTransportTypes().catch(() => []),
        ]);
        if (cancelled) return;
        setJob(j);
        setFuelEntries(fList);
        setPhotos(pList);
        setCompany(comp);
        setPricingMethods(pmList);
        setMachines(mList);
        setDrivers(dList);
        setTransportTypes(ttList);
        setDraft((prev) => (prev.noteText ? {} : { noteText: j.notes || "" }));
        await loadExecutionHistory();
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

  // Transportation is a separate additive charge; the server is authoritative
  // for each charge's total (trips × rate). We only SUM the server totals here
  // for display — never recompute the work price or invent a grand total the
  // backend won't also produce (invoice total = work + Σ transport).
  const transportTotal = round2(transportCharges.reduce((sum, c) => sum + Number(c.totalAmount), 0));
  const grandTotal = finalAmount != null ? round2(finalAmount + transportTotal) : null;

  // Job Timeline built ENTIRELY from the authoritative work-session and
  // assignment-change records (never from the current machine/driver). Each
  // session is a worked interval; the gaps between them are pauses; assignment
  // changes are point events. Resolve resource ids to labels via the loaded
  // machine/driver lists (falling back to the session's own embedded names).
  const machineLabel = (id: string | null) =>
    (id && machines.find((m) => m.id === id)?.registrationNumber) || "—";
  const driverLabel = (id: string | null) =>
    (id && drivers.find((d) => d.id === id)?.employee?.name) || "—";
  const timeMs = (iso: string) => new Date(iso).getTime();
  const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const terminalStatus = ["STOPPED", "COMPLETED", "CANCELLED"].includes(job.status);

  type TimelineEvent = { at: string; title: string; detail?: string; tone: "start" | "stop" | "change" };
  const timelineEvents: TimelineEvent[] = [];
  workSessions.forEach((s, i) => {
    const mReg = s.machine?.registrationNumber ?? machineLabel(s.machineId);
    const dName = s.driver?.employee?.name ?? driverLabel(s.driverId);
    timelineEvents.push({
      at: s.startedAt,
      title: i === 0 ? "Work started" : "Work resumed",
      detail: `${mReg} · ${dName}`,
      tone: "start",
    });
    if (s.endedAt) {
      const isLast = i === workSessions.length - 1;
      timelineEvents.push({
        at: s.endedAt,
        title: isLast && terminalStatus ? "Work stopped" : "Work paused",
        detail: s.durationSec != null ? formatDurationWords(s.durationSec) : undefined,
        tone: "stop",
      });
    }
  });
  assignmentChanges.forEach((c) => {
    const isMachine = c.field === "MACHINE";
    const from = isMachine ? machineLabel(c.oldMachineId) : driverLabel(c.oldDriverId);
    const to = isMachine ? machineLabel(c.newMachineId) : driverLabel(c.newDriverId);
    timelineEvents.push({
      at: c.changedAt,
      title: isMachine ? "Machine changed" : "Driver changed",
      detail: `${from} → ${to} · ${c.reason}`,
      tone: "change",
    });
  });
  timelineEvents.sort((a, b) => timeMs(a.at) - timeMs(b.at));

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

  // Pause now requires a reason (Part 6) — same quick-pick + free-text pattern
  // as resume. A pause CLOSES the current work session and RELEASES the
  // Machine/Driver server-side; the frozen elapsed time is unaffected.
  const handleConfirmPause = async () => {
    if (!draft.pauseReason.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.pauseJob(job.id, draft.pauseReason.trim());
      setDraft({ activeSubDialog: null, pauseReason: "" });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to pause job");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reassign the PAUSED job's Machine — authoritative; the new machine is NOT
  // occupied until the job actually resumes. Reason mandatory; audited server-side.
  const handleConfirmChangeMachine = async () => {
    if (!draft.changeMachineId || !draft.changeMachineReason.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.changeJobMachine(job.id, draft.changeMachineId, draft.changeMachineReason.trim());
      setDraft({ activeSubDialog: null, changeMachineId: "", changeMachineReason: "" });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to change machine");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmChangeDriver = async () => {
    if (!draft.changeDriverId || !draft.changeDriverReason.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.changeJobDriver(job.id, draft.changeDriverId, draft.changeDriverReason.trim());
      setDraft({ activeSubDialog: null, changeDriverId: "", changeDriverReason: "" });
      notifyDataRefresh("jobs");
      await loadJob();
    } catch (err: any) {
      setError(err.message || "Failed to change driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transportation: optional structured charge. The server computes the
  // authoritative total (trips × rate) — the client never sends a total.
  const handleAddTransport = async () => {
    const trips = parseInt(draft.transportTrips, 10);
    const ratePerTrip = parseFloat(draft.transportRate);
    if (!draft.transportTypeId || !Number.isFinite(trips) || trips <= 0 || !Number.isFinite(ratePerTrip) || ratePerTrip < 0) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await api.addJobTransportCharge(job.id, { transportTypeId: draft.transportTypeId, trips, ratePerTrip });
      setDraft({ activeSubDialog: null, transportTypeId: "", transportTrips: "", transportRate: "" });
      await loadExecutionHistory();
      notifyDataRefresh("jobs");
    } catch (err: any) {
      setError(err.message || "Failed to add transportation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransport = async (chargeId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.deleteJobTransportCharge(job.id, chargeId);
      await loadExecutionHistory();
      notifyDataRefresh("jobs");
    } catch (err: any) {
      setError(err.message || "Failed to remove transportation");
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

    // Pause requires a reason (Part 6). Same quick-pick + free-text pattern
    // as resume; "Other" is simply a free-text reason.
    if (draft.activeSubDialog === "pauseReason") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Why are you pausing?</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <div className="sa-resume-reason-chips">
              {PAUSE_REASON_QUICK_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`sa-segmented-btn ${draft.pauseReason === opt ? "is-active" : ""}`}
                  onClick={() => setDraft({ pauseReason: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Input
              label="Pause reason *"
              value={draft.pauseReason}
              onChange={(e) => setDraft({ pauseReason: e.target.value })}
              placeholder="Or type a custom reason (required)"
            />
            <p className="sa-input-hint">Pausing releases the machine and driver for other jobs. The elapsed time is preserved.</p>
            <div className="sa-form-actions">
              <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                Cancel
              </Button>
              <Button type="button" variant="warning" isLoading={isSubmitting} disabled={!draft.pauseReason.trim()} onClick={handleConfirmPause}>
                Confirm &amp; Pause
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Change Machine while PAUSED. New machine stays idle until Resume.
    if (draft.activeSubDialog === "changeMachine") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Change Machine</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <div className="sa-input-group">
              <label className="sa-input-label">Current Machine</label>
              <div className="sa-readonly-field">{job.machine?.registrationNumber ?? "—"}</div>
            </div>
            <div className="sa-input-group">
              <label className="sa-input-label">New Machine *</label>
              <select
                className="sa-input"
                value={draft.changeMachineId}
                onChange={(e) => setDraft({ changeMachineId: e.target.value })}
              >
                <option value="">Select a machine…</option>
                {machines
                  .filter((m) => m.id !== job.machineId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.registrationNumber}
                    </option>
                  ))}
              </select>
            </div>
            <div className="sa-resume-reason-chips">
              {MACHINE_CHANGE_REASON_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`sa-segmented-btn ${draft.changeMachineReason === opt ? "is-active" : ""}`}
                  onClick={() => setDraft({ changeMachineReason: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Input
              label="Reason *"
              value={draft.changeMachineReason}
              onChange={(e) => setDraft({ changeMachineReason: e.target.value })}
              placeholder="Reason for the change (required)"
            />
            <div className="sa-form-actions">
              <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!draft.changeMachineId || !draft.changeMachineReason.trim()}
                onClick={handleConfirmChangeMachine}
              >
                Change Machine
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Change Driver while PAUSED. New driver stays idle until Resume.
    if (draft.activeSubDialog === "changeDriver") {
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Change Driver</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <div className="sa-input-group">
              <label className="sa-input-label">Current Driver</label>
              <div className="sa-readonly-field">{job.driver?.employee?.name ?? "—"}</div>
            </div>
            <div className="sa-input-group">
              <label className="sa-input-label">New Driver *</label>
              <select
                className="sa-input"
                value={draft.changeDriverId}
                onChange={(e) => setDraft({ changeDriverId: e.target.value })}
              >
                <option value="">Select a driver…</option>
                {drivers
                  .filter((d) => d.id !== job.driverId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.employee?.name ?? "Driver"}
                    </option>
                  ))}
              </select>
            </div>
            <div className="sa-resume-reason-chips">
              {DRIVER_CHANGE_REASON_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`sa-segmented-btn ${draft.changeDriverReason === opt ? "is-active" : ""}`}
                  onClick={() => setDraft({ changeDriverReason: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Input
              label="Reason *"
              value={draft.changeDriverReason}
              onChange={(e) => setDraft({ changeDriverReason: e.target.value })}
              placeholder="Reason for the change (required)"
            />
            <div className="sa-form-actions">
              <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!draft.changeDriverId || !draft.changeDriverReason.trim()}
                onClick={handleConfirmChangeDriver}
              >
                Change Driver
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Add a transportation charge. Total is server-computed (trips × rate);
    // the preview here is display-only.
    if (draft.activeSubDialog === "transport") {
      const previewTrips = parseInt(draft.transportTrips, 10);
      const previewRate = parseFloat(draft.transportRate);
      const previewTotal =
        Number.isFinite(previewTrips) && Number.isFinite(previewRate) && previewTrips > 0 && previewRate >= 0
          ? round2(previewTrips * previewRate)
          : null;
      return (
        <div className="sa-job-subdialog-overlay">
          <div className="sa-job-subdialog">
            <div className="sa-job-subdialog-header">
              <h4>Add Transportation</h4>
              <button type="button" className="sa-icon-action" onClick={() => setDraft({ activeSubDialog: null })}>
                <X size={16} />
              </button>
            </div>
            <div className="sa-input-group">
              <label className="sa-input-label">Transportation Type *</label>
              <select
                className="sa-input"
                value={draft.transportTypeId}
                onChange={(e) => setDraft({ transportTypeId: e.target.value })}
              >
                <option value="">Select a type…</option>
                {transportTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Number of Trips *"
              type="number"
              min="1"
              step="1"
              value={draft.transportTrips}
              onChange={(e) => setDraft({ transportTrips: e.target.value })}
              placeholder="e.g. 2"
            />
            <Input
              label="Rate per Trip (₹) *"
              type="number"
              min="0"
              step="0.01"
              value={draft.transportRate}
              onChange={(e) => setDraft({ transportRate: e.target.value })}
              placeholder="e.g. 1000"
            />
            {previewTotal != null && (
              <div className="sa-price-live" style={{ marginTop: 4 }}>
                <div>
                  <div className="sa-price-amt">{formatCurrency(previewTotal)}</div>
                  <div className="sa-price-method">
                    {previewTrips} trips × {formatCurrency(previewRate)} — confirmed by server on save
                  </div>
                </div>
              </div>
            )}
            <div className="sa-form-actions">
              <Button type="button" variant="secondary" onClick={() => setDraft({ activeSubDialog: null })}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmitting}
                disabled={!draft.transportTypeId || !previewTotal}
                onClick={handleAddTransport}
              >
                Add Transportation
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
              onClick={
                job.status === "WORKING"
                  ? () => setDraft({ activeSubDialog: "pauseReason" })
                  : () => setDraft({ activeSubDialog: "resumeReason" })
              }
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

        {/* Machine/Driver reassignment — only while PAUSED (resources released),
            only for authorised users. The new resource stays idle until Resume,
            which re-checks availability server-side. */}
        {job.status === "PAUSED" && canManageAssignments && (
          <div className="sa-btn-row-half">
            <Button
              variant="secondary"
              isLoading={isSubmitting}
              onClick={() =>
                setDraft({ activeSubDialog: "changeMachine", changeMachineId: job.machineId || "", changeMachineReason: "" })
              }
            >
              <ArrowLeftRight size={15} style={{ marginRight: 6 }} /> Change Machine
            </Button>
            <Button
              variant="secondary"
              isLoading={isSubmitting}
              onClick={() =>
                setDraft({ activeSubDialog: "changeDriver", changeDriverId: job.driverId || "", changeDriverReason: "" })
              }
            >
              <ArrowLeftRight size={15} style={{ marginRight: 6 }} /> Change Driver
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

            {/* Transportation — optional, added before final submission. Separate
                from the work timer/pricing; the invoice total will be
                work + Σ transport. */}
            <div className="sa-transport-section">
              <div className="sa-transport-head">
                <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <Truck size={16} /> Transportation
                </h4>
                <Button type="button" variant="secondary" size="sm" onClick={() => setDraft({ activeSubDialog: "transport" })}>
                  + Add
                </Button>
              </div>
              {transportCharges.length === 0 ? (
                <p className="sa-input-hint" style={{ margin: "4px 0 0" }}>
                  Optional. Add a transport charge (e.g. hauling produce) if the customer is being charged for it.
                </p>
              ) : (
                <div className="sa-transport-list">
                  {transportCharges.map((c) => (
                    <div key={c.id} className="sa-transport-item">
                      <span>
                        {c.transportTypeName} · {c.trips} × {formatCurrency(c.ratePerTrip)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <b>{formatCurrency(c.totalAmount)}</b>
                        <button
                          type="button"
                          className="sa-icon-action"
                          title="Remove"
                          onClick={() => handleDeleteTransport(c.id)}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    </div>
                  ))}
                  <div className="sa-transport-item" style={{ fontWeight: 600 }}>
                    <span>Transportation total</span>
                    <span>{formatCurrency(transportTotal)}</span>
                  </div>
                </div>
              )}
            </div>

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
            <span className="sa-finfo-label">Work charges</span>
            <span className="sa-finfo-val">{finalAmount != null ? formatCurrency(finalAmount) : "—"}</span>
          </div>
          {transportCharges.map((c) => (
            <div className="sa-finfo-item" style={{ gridColumn: "1 / -1" }} key={c.id}>
              <span className="sa-finfo-label">
                Transportation · {c.transportTypeName} ({c.trips} × {formatCurrency(c.ratePerTrip)})
              </span>
              <span className="sa-finfo-val">{formatCurrency(c.totalAmount)}</span>
            </div>
          ))}
          <div className="sa-finfo-item" style={{ gridColumn: "1 / -1" }}>
            <span className="sa-finfo-label">Total</span>
            <span className="sa-finfo-val sa-amount-bold">
              {grandTotal != null ? formatCurrency(grandTotal) : "—"}
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

      {/* Job Timeline — authoritative execution history (sessions + changes) */}
      {timelineEvents.length > 0 && (
        <div className="sa-timeline-section">
          <h4>Job Timeline</h4>
          <ol className="sa-timeline">
            {timelineEvents.map((ev, idx) => (
              <li key={idx} className={`sa-timeline-item is-${ev.tone}`}>
                <span className="sa-timeline-time">{timeLabel(ev.at)}</span>
                <span className="sa-timeline-body">
                  <b>{ev.title}</b>
                  {ev.detail ? <span className="sa-timeline-detail"> — {ev.detail}</span> : null}
                </span>
              </li>
            ))}
          </ol>

          {/* Per-resource attribution (Parts I/J) — actual worked time per
              Machine / Driver, never the current/final assignment. Sourced from
              the authoritative GET /jobs/:id/work-summary rollup when available
              (single source of truth with the backend/Flutter), falling back to
              a client-side sum of the loaded sessions if that request failed. */}
          {(() => {
            let perDriver: Array<{ name: string; sec: number }>;
            let perMachine: Array<{ name: string; sec: number }>;
            let totalSec: number;
            let sessionCount: number;
            if (workSummary) {
              perDriver = workSummary.perDriver.map((d) => ({ name: d.driverName, sec: d.seconds }));
              perMachine = workSummary.perMachine.map((m) => ({ name: m.registrationNumber, sec: m.seconds }));
              totalSec = workSummary.totalWorkedSeconds;
              sessionCount = workSummary.sessionCount;
            } else {
              const byDriver = new Map<string, { name: string; sec: number }>();
              const byMachine = new Map<string, { name: string; sec: number }>();
              let sum = 0;
              for (const s of workSessions) {
                const sec = s.durationSec ?? 0;
                sum += sec;
                const dName = s.driver?.employee?.name ?? driverLabel(s.driverId);
                const mName = s.machine?.registrationNumber ?? machineLabel(s.machineId);
                byDriver.set(s.driverId, { name: dName, sec: (byDriver.get(s.driverId)?.sec ?? 0) + sec });
                byMachine.set(s.machineId, { name: mName, sec: (byMachine.get(s.machineId)?.sec ?? 0) + sec });
              }
              perDriver = [...byDriver.values()];
              perMachine = [...byMachine.values()];
              totalSec = sum;
              sessionCount = workSessions.length;
            }
            const fmtH = (sec: number) => `${Math.round((sec / 3600) * 100) / 100}h`;
            // Total worked time / session count is shown for every started job;
            // the per-resource split only adds signal once a job spans more than
            // one driver or machine (i.e. it was reassigned mid-way).
            const showSplit = perDriver.length > 1 || perMachine.length > 1;
            return (
              <div className="sa-attribution">
                <div>
                  <span className="sa-finfo-label">Total worked</span>
                  <span className="sa-attribution-row">
                    <b>{formatDurationWords(totalSec)}</b> · {sessionCount}{" "}
                    {sessionCount === 1 ? "session" : "sessions"}
                  </span>
                </div>
                {showSplit && (
                  <>
                    <div>
                      <span className="sa-finfo-label">Driver time</span>
                      {perDriver.map((d, i) => (
                        <span key={i} className="sa-attribution-row">
                          {d.name}: <b>{fmtH(d.sec)}</b>
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className="sa-finfo-label">Machine time</span>
                      {perMachine.map((m, i) => (
                        <span key={i} className="sa-attribution-row">
                          {m.name}: <b>{fmtH(m.sec)}</b>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {renderSubDialog()}
    </div>
  );
};
