import React, { useEffect, useState } from "react";
import { Star, Loader2, AlertCircle } from "lucide-react";
import { SaasAdminLayout } from "./SaasAdminLayout";
import { getAdminFeedback, updateAdminFeedbackStatus } from "../../../lib/saasApi";

export const SaasAdminFeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [status, setStatus] = useState("SUBMITTED");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadFeedback = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAdminFeedback();
      setFeedbacks(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load customer feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await updateAdminFeedbackStatus(selectedFeedback.id, status, adminNotes);
      setSelectedFeedback(null);
      await loadFeedback();
    } catch (err: any) {
      setUpdateError(err.message || "Failed to save changes.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SaasAdminLayout>
      <div className="space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-white">Customer Feedback & Product Requests</h1>
          <p className="text-xs text-slate-400">Review feature suggestions, usability reports, and product ratings from licensed customers</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading feedback...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-6 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>{errorMsg}</p>
              <button
                type="button"
                onClick={loadFeedback}
                className="px-3 py-1.5 rounded-lg bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs font-bold hover:bg-rose-900"
              >
                Retry
              </button>
            </div>
          </div>
        ) : feedbacks.length > 0 ? (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span>{fb.saasUser?.customerProfile?.businessName || fb.saasUser?.email}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 uppercase">{fb.category}</span>
                      {fb.rating && (
                        <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                          <Star className="w-3.5 h-3.5 fill-current" /> {fb.rating}/5
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">
                      {fb.status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedFeedback(fb);
                        setStatus(fb.status);
                        setAdminNotes(fb.adminNotes || "");
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {fb.comment}
                </p>

                {fb.adminNotes && (
                  <p className="text-xs text-emerald-400">
                    <strong>Product Team Note: </strong>{fb.adminNotes}
                  </p>
                )}

                <p className="text-[11px] text-slate-500">Submitted: {new Date(fb.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            No customer feedback submitted yet.
          </div>
        )}

        {/* UPDATE FEEDBACK MODAL */}
        {selectedFeedback && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Update Customer Feedback</h3>

              <form onSubmit={handleUpdate} className="space-y-4 text-xs">
                {updateError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{updateError}</span>
                  </div>
                )}
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="PLANNED">PLANNED</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Product Team Response / Notes</label>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter public note visible to customer in their portal..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFeedback(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </SaasAdminLayout>
  );
};
