import React, { useEffect, useState } from "react";
import { Star, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { getSaasMyFeedback, submitSaasFeedback } from "../../../lib/saasApi";
import type { CustomerFeedback } from "../../../types/saas";

export const SaasPortalFeedback: React.FC = () => {
  const [category, setCategory] = useState("FEATURE_REQUEST");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  
  const [pastFeedback, setPastFeedback] = useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadFeedback = async () => {
    try {
      const data = await getSaasMyFeedback();
      setPastFeedback(data);
    } catch {
      // Ignore
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!comment.trim() || comment.length < 5) {
      setErrorMsg("Feedback comment must be at least 5 characters long.");
      return;
    }

    setLoading(true);
    try {
      await submitSaasFeedback({
        category,
        rating,
        comment: comment.trim(),
      });

      setSuccessMsg("Thank you! Your feedback has been submitted to product engineering.");
      setComment("");
      await loadFeedback();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit feedback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SaasPortalLayout>
      <div className="space-y-8 max-w-4xl">
        
        <div>
          <h1 className="text-2xl font-black text-white">Product Feedback & Feature Requests</h1>
          <p className="text-xs text-slate-400">Help shape the future of ShabooAgri by sharing your suggestions and feature requests</p>
        </div>

        {/* SUBMIT FEEDBACK FORM */}
        <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-5">
          <h2 className="text-lg font-bold text-white">Submit New Feedback</h2>

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="FEATURE_REQUEST">Feature Request</option>
                  <option value="BUG_REPORT">Bug Report</option>
                  <option value="GENERAL">General Suggestion</option>
                  <option value="IMPROVEMENT">Usability Improvement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2 pt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 focus:outline-none transition-transform hover:scale-125 ${
                        star <= rating ? "text-amber-400" : "text-slate-600"
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Your Feedback / Feature Suggestion <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain the feature or improvement you would like to see in ShabooAgri..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>SUBMIT FEEDBACK</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* PAST FEEDBACK LIST */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Your Submitted Feedback</h2>

          {fetching ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Loading past feedback...</span>
            </div>
          ) : pastFeedback.length > 0 ? (
            <div className="space-y-3">
              {pastFeedback.map((fb) => (
                <div key={fb.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <span className="px-2.5 py-0.5 rounded bg-slate-800 uppercase">{fb.category}</span>
                      {fb.rating && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-current" /> {fb.rating}/5
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[11px] font-bold uppercase">
                      {fb.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200">{fb.comment}</p>
                  
                  {fb.adminNotes && (
                    <p className="text-xs text-emerald-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-2">
                      <strong>Product Team Response: </strong>{fb.adminNotes}
                    </p>
                  )}

                  <p className="text-[11px] text-slate-500">
                    Submitted on: {new Date(fb.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              No feedback submitted yet.
            </div>
          )}
        </div>

      </div>
    </SaasPortalLayout>
  );
};
