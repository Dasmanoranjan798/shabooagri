import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { SaasAdminLayout } from "./SaasAdminLayout";
import { getAdminEnquiries, updateAdminEnquiryStatus } from "../../../lib/saasApi";

export const SaasAdminEnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);
  const [status, setStatus] = useState("UNREAD");
  const [responseNotes, setResponseNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadEnquiries = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAdminEnquiries();
      setEnquiries(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load enquiries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await updateAdminEnquiryStatus(selectedEnquiry.id, status, responseNotes);
      setSelectedEnquiry(null);
      await loadEnquiries();
    } catch (err: any) {
      setUpdateError(err.message || "Failed to save response.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SaasAdminLayout>
      <div className="space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-white">Contact Us Inbox</h1>
          <p className="text-xs text-slate-400">Review and respond to visitor and customer contact submissions</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading enquiries...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-6 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>{errorMsg}</p>
              <button
                type="button"
                onClick={loadEnquiries}
                className="px-3 py-1.5 rounded-lg bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs font-bold hover:bg-rose-900"
              >
                Retry
              </button>
            </div>
          </div>
        ) : enquiries.length > 0 ? (
          <div className="space-y-4">
            {enquiries.map((eq) => (
              <div key={eq.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{eq.subject}</h3>
                    <p className="text-xs text-slate-400">
                      From: <strong className="text-slate-200">{eq.name}</strong> ({eq.businessName || "N/A"}) • {eq.email} • {eq.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      eq.status === "UNREAD"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : eq.status === "IN_REVIEW"
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    }`}>
                      {eq.status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedEnquiry(eq);
                        setStatus(eq.status);
                        setResponseNotes(eq.responseNotes || "");
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      Manage
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {eq.message}
                </p>

                {eq.responseNotes && (
                  <p className="text-xs text-emerald-400">
                    <strong>Admin Notes: </strong>{eq.responseNotes}
                  </p>
                )}

                <p className="text-[11px] text-slate-500">Submitted: {new Date(eq.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            No contact enquiries in inbox.
          </div>
        )}

        {/* UPDATE ENQUIRY MODAL */}
        {selectedEnquiry && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Update Enquiry</h3>

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
                    <option value="UNREAD">UNREAD</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Response / Internal Notes</label>
                  <textarea
                    rows={3}
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEnquiry(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                  >
                    Save Response
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
