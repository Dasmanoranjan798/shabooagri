import React, { useEffect, useState } from "react";
import type { Job, JobFuelEntry, JobPhoto } from "../../types/job";
import type { CompanyProfile } from "../../types/settings";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Camera, Fuel, Truck, StickyNote } from "lucide-react";

interface JobExecutionModalProps {
 job: Job | null;
 isOpen: boolean;
 onClose: () => void;
 onUpdate: () => void;
}

export const JobExecutionModal: React.FC<JobExecutionModalProps> = ({
 job,
 isOpen,
 onClose,
 onUpdate,
}) => {
 const customerTerm = getTerm("customer");
 const villageTerm = getTerm("village");
 const driverTerm = getTerm("driver");

 const [fuelEntries, setFuelEntries] = useState<JobFuelEntry[]>([]);
 const [photos, setPhotos] = useState<JobPhoto[]>([]);
 const [company, setCompany] = useState<CompanyProfile | null>(null);

 // Live timer tick
 const [elapsedSec, setElapsedSec] = useState<number>(0);

 // Quick Action Dialogs
 const [showFuelModal, setShowFuelModal] = useState<boolean>(false);
 const [fuelLitres, setFuelLitres] = useState<string>("");
 const [fuelCost, setFuelCost] = useState<string>("");

 const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
 const [photoFile, setPhotoFile] = useState<File | null>(null);
 const [photoCaption, setPhotoCaption] = useState<string>("");

 const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
 const [noteText, setNoteText] = useState<string>("");

 const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
 const [completeAcres, setCompleteAcres] = useState<string>("");
 const [completeHours, setCompleteHours] = useState<string>("");
 const [completeNotes, setCompleteNotes] = useState<string>("");

 const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);

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

 // Load sub-resources (fuel entries & photos & company) when opened
 useEffect(() => {
 if (!isOpen || !job) return;

 const targetJobId = job.id;
 setNoteText(job.notes || "");
 setCompleteAcres(job.completedAcres != null ? job.completedAcres.toString() : "");

 async function loadResources() {
 try {
 const [fList, pList, comp] = await Promise.all([
 api.listJobFuelEntries(targetJobId),
 api.listJobPhotos(targetJobId),
 api.getCompanyProfile().catch(() => null),
 ]);
 setFuelEntries(fList);
 setPhotos(pList);
 setCompany(comp);
 } catch (err: any) {
 console.error("Failed to load job sub-resources", err);
 }
 }
 loadResources();
 }, [isOpen, job?.id]);

 if (!job) return null;

 // Format running time as HH:MM:SS or Xh Ym
 const formatRunningTime = (): string => {
 if (job.status === "NOT_STARTED") return "00:00:00";
 if (job.status === "COMPLETED") {
 if (job.actualHours != null) return `${job.actualHours} hrs`;
 return "Completed";
 }

 let sec = elapsedSec;
 if (job.status === "PAUSED" && job.startTime) {
 // Frozen paused time
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

 // Workflow Handlers
 const handleStart = async () => {
 setIsSubmitting(true);
 setError(null);
 try {
 await api.startJob(job.id);
 onUpdate();
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
 onUpdate();
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
 onUpdate();
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
 actualHours: completeHours ? parseFloat(completeHours) : undefined,
 completedAcres: completeAcres ? parseFloat(completeAcres) : undefined,
 notes: completeNotes || undefined,
 });
 setShowCompleteModal(false);
 onUpdate();
 } catch (err: any) {
 setError(err.message || "Failed to complete job");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleFuelSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!fuelLitres || parseFloat(fuelLitres) <= 0) return;

 setIsSubmitting(true);
 setError(null);
 try {
 await api.addJobFuelEntry(
 job.id,
 parseFloat(fuelLitres),
 fuelCost ? parseFloat(fuelCost) : undefined
 );
 setFuelLitres("");
 setFuelCost("");
 setShowFuelModal(false);

 const updatedEntries = await api.listJobFuelEntries(job.id);
 setFuelEntries(updatedEntries);
 onUpdate();
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
 await api.uploadJobPhoto(job.id, photoFile, photoCaption || undefined);
 setPhotoFile(null);
 setPhotoCaption("");
 setShowPhotoModal(false);

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
 await api.updateJobDetails(job.id, { notes: noteText });
 setShowNoteModal(false);
 onUpdate();
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

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title={
 <div className="sa-modal-booking-title">
 <span>Job Execution #{job.booking.bookingNumber}</span>
 <Badge variant={getStatusBadgeVariant(job.status)}>
 {job.status.replace(/_/g, " ")}
 </Badge>
 </div>
 }
 maxWidth="650px"
 >
 <div className="sa-job-execution-body">
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
 <Button
 variant="primary"
 size="lg"
 className="sa-action-main-btn"
 isLoading={isSubmitting}
 onClick={handleStart}
 >
 ▶ Start Job
 </Button>
 )}

 {job.status === "WORKING" && (
 <div className="sa-action-btn-group">
 <Button
 variant="warning"
 size="lg"
 isLoading={isSubmitting}
 onClick={handlePause}
 >
 ⏸ Pause Job
 </Button>
 <Button
 variant="success"
 size="lg"
 isLoading={isSubmitting}
 onClick={() => setShowCompleteModal(true)}
 >
 Complete Job
 </Button>
 </div>
 )}

 {job.status === "PAUSED" && (
 <div className="sa-action-btn-group">
 <Button
 variant="primary"
 size="lg"
 isLoading={isSubmitting}
 onClick={handleResume}
 >
 ▶ Resume Job
 </Button>
 <Button
 variant="success"
 size="lg"
 isLoading={isSubmitting}
 onClick={() => setShowCompleteModal(true)}
 >
 Complete Job
 </Button>
 </div>
 )}

 {job.status === "COMPLETED" && (
 <div className="sa-alert sa-alert-success" style={{ textCenter: "center", width: "100%" } as any}>
 Job Completed ({job.actualHours != null ? `${job.actualHours} hrs` : ""}
 {job.completedAcres != null ? ` • ${job.completedAcres} acres` : ""})
 </div>
 )}
 </div>

 {/* Quick Action Icon Buttons (§11.6) */}
 {job.status !== "COMPLETED" && (
 <div className="sa-quick-field-actions">
 <button className="sa-qaction-item" onClick={() => setShowFuelModal(true)}>
 <span className="sa-qaction-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <Fuel size={20} />
 </span>
 <span className="sa-qaction-label">+ Add Fuel</span>
 </button>

 <button className="sa-qaction-item" onClick={() => setShowPhotoModal(true)}>
 <span className="sa-qaction-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <Camera size={20} />
 </span>
 <span className="sa-qaction-label">+ Add Photo</span>
 </button>

 <button className="sa-qaction-item" onClick={() => setShowNoteModal(true)}>
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
 </div>

 {/* Fuel Entry Sub-Modal */}
 <Modal
 isOpen={showFuelModal}
 onClose={() => setShowFuelModal(false)}
 title="Add Fuel Entry"
 maxWidth="400px"
 >
 <form onSubmit={handleFuelSubmit} className="sa-booking-form">
 <Input
 label="Fuel Quantity (Litres) *"
 type="number"
 min="0.1"
 step="0.1"
 value={fuelLitres}
 onChange={(e) => setFuelLitres(e.target.value)}
 placeholder="e.g. 15.5"
 required
 autoFocus
 />
 <Input
 label="Total Cost (₹, Optional)"
 type="number"
 min="0"
 step="1"
 value={fuelCost}
 onChange={(e) => setFuelCost(e.target.value)}
 placeholder="e.g. 1400"
 />
 <div className="sa-form-actions">
 <Button type="button" variant="secondary" onClick={() => setShowFuelModal(false)}>
 Cancel
 </Button>
 <Button type="submit" variant="primary" isLoading={isSubmitting}>
 Save Fuel Log
 </Button>
 </div>
 </form>
 </Modal>

 {/* Photo Upload Sub-Modal */}
 <Modal
 isOpen={showPhotoModal}
 onClose={() => setShowPhotoModal(false)}
 title="Upload Job Photo"
 maxWidth="400px"
 >
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
 value={photoCaption}
 onChange={(e) => setPhotoCaption(e.target.value)}
 placeholder="e.g. Field condition before start"
 />
 <div className="sa-form-actions">
 <Button type="button" variant="secondary" onClick={() => setShowPhotoModal(false)}>
 Cancel
 </Button>
 <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!photoFile}>
 Upload Photo
 </Button>
 </div>
 </form>
 </Modal>

 {/* Note Sub-Modal */}
 <Modal
 isOpen={showNoteModal}
 onClose={() => setShowNoteModal(false)}
 title="Add Field Note"
 maxWidth="450px"
 >
 <form onSubmit={handleNoteSubmit} className="sa-booking-form">
 <div className="sa-input-group">
 <label className="sa-input-label">Note Content</label>
 <textarea
 className="sa-input sa-textarea"
 rows={3}
 value={noteText}
 onChange={(e) => setNoteText(e.target.value)}
 placeholder="Record field observations, soil state, or delays..."
 autoFocus
 />
 </div>
 <div className="sa-form-actions">
 <Button type="button" variant="secondary" onClick={() => setShowNoteModal(false)}>
 Cancel
 </Button>
 <Button type="submit" variant="primary" isLoading={isSubmitting}>
 Save Note
 </Button>
 </div>
 </form>
 </Modal>

 {/* Complete Job Sub-Modal */}
 <Modal
   isOpen={showCompleteModal}
   onClose={() => setShowCompleteModal(false)}
   title="Complete Job Execution"
   maxWidth="450px"
 >
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
       value={completeAcres}
       onChange={(e) => setCompleteAcres(e.target.value)}
       placeholder="e.g. 4.5"
     />
     <Input
       label="Manual Actual Hours (Optional override)"
       type="number"
       min="0"
       step="0.1"
       value={completeHours}
       onChange={(e) => setCompleteHours(e.target.value)}
       placeholder="Leave blank for auto-computed timer hours"
     />
     <div className="sa-input-group">
       <label className="sa-input-label">Final Completion Notes</label>
       <textarea
         className="sa-input sa-textarea"
         rows={2}
         value={completeNotes}
         onChange={(e) => setCompleteNotes(e.target.value)}
         placeholder="Summary of work done..."
       />
     </div>
     <div className="sa-form-actions">
       <Button type="button" variant="secondary" onClick={() => setShowCompleteModal(false)}>
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
 </Modal>
 </Modal>
 );
};
