import { useState } from "react";
import { api } from "../../lib/api";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Button } from "../../components/ui/Button";

// Migrated onto the shared task-tray system (Pass 2, Batch 1), replacing
// the two window.prompt-based cancel flows that used to live separately in
// JobsPage.tsx (row action) and JobExecutionModal.tsx (its own Cancel Job
// button) — both now open this one task type instead. Unlike Void Reason,
// a cancel reason is optional (matches the two window.prompt flows this
// replaces, neither of which required one).

export interface JobCancelReasonInitProps {
  jobId: string;
}

interface JobCancelReasonDraft {
  reason: string;
}

export const JobCancelReasonTask: TaskContentComponent<JobCancelReasonInitProps> = ({
  taskId,
  initProps,
  onRequestClose,
}) => {
  const { jobId } = initProps;
  const [draft, setDraft] = useTaskDraft<JobCancelReasonDraft>(taskId, { reason: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.cancelJob(jobId, draft.reason.trim() || undefined);
      notifyDataRefresh("jobs");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to cancel job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1 }}>
        <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          This is Owner-only and reverses the job's booking to Cancelled too.
        </p>
        <label className="sa-input-label" htmlFor="job-cancel-reason">
          Reason (optional)
        </label>
        <textarea
          id="job-cancel-reason"
          className="sa-input"
          rows={3}
          value={draft.reason}
          onChange={(e) => setDraft({ reason: e.target.value })}
          placeholder="Why is this job being cancelled?"
          autoFocus
        />
        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: "0.85rem", marginTop: "0.5rem", marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>
      <div className="sa-form-actions">
        <Button variant="secondary" onClick={onRequestClose} disabled={isSubmitting}>
          Back
        </Button>
        <Button variant="danger" onClick={handleConfirm} isLoading={isSubmitting}>
          Cancel Job
        </Button>
      </div>
    </div>
  );
};
