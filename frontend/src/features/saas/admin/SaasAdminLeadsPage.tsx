import React, { useEffect, useState } from "react";
import { Loader2, Edit3, AlertCircle } from "lucide-react";
import { SaasAdminLayout } from "./SaasAdminLayout";
import { getAdminLeads, updateAdminLeadStatus } from "../../../lib/saasApi";

export const SaasAdminLeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("NEW");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadLeads = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAdminLeads();
      setLeads(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load sales leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await updateAdminLeadStatus(selectedLead.id, newStatus, notes);
      setSelectedLead(null);
      await loadLeads();
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
          <h1 className="text-2xl font-black text-white">Sales Lead Pipeline</h1>
          <p className="text-xs text-slate-400">Track and follow up with commercial prospects and trial leads</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading leads...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-6 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>{errorMsg}</p>
              <button
                type="button"
                onClick={loadLeads}
                className="px-3 py-1.5 rounded-lg bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs font-bold hover:bg-rose-900"
              >
                Retry
              </button>
            </div>
          </div>
        ) : leads.length > 0 ? (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <th className="py-4 px-6">Lead / Business</th>
                    <th className="py-4 px-6">Phone / Email</th>
                    <th className="py-4 px-6">Source</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Follow-up Notes</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{lead.name}</div>
                        <div className="text-slate-400">{lead.businessName || "Individual Fleet"}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-mono text-emerald-400">{lead.phone}</div>
                        <div className="text-slate-400">{lead.email || "No email"}</div>
                      </td>
                      <td className="py-4 px-6 font-semibold">{lead.source || "WEBSITE"}</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 max-w-xs truncate">
                        {lead.followUpNotes || "No notes"}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setNewStatus(lead.status);
                            setNotes(lead.followUpNotes || "");
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Update</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            No sales leads recorded yet.
          </div>
        )}

        {/* UPDATE LEAD MODAL */}
        {selectedLead && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Update Lead: {selectedLead.name}</h3>

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
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="IN_CONVERSATION">IN_CONVERSATION</option>
                    <option value="CONVERTED">CONVERTED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Follow-up Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
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
