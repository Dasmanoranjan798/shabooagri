import React, { useEffect, useState } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { SaasAdminLayout } from "./SaasAdminLayout";
import { extendAdminLicense, getAdminLicenses } from "../../../lib/saasApi";

export const SaasAdminLicensesPage: React.FC = () => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Extend Modal State
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);
  const [extensionDays, setExtensionDays] = useState(30);
  const [reason, setReason] = useState("");
  const [extending, setExtending] = useState(false);
  const [extSuccess, setExtSuccess] = useState<string | null>(null);
  const [extError, setExtError] = useState<string | null>(null);

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const data = await getAdminLicenses();
      setLicenses(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, []);

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;
    setExtSuccess(null);
    setExtError(null);

    if (!reason.trim() || reason.length < 3) {
      setExtError("Please enter a valid administrative reason.");
      return;
    }

    setExtending(true);
    try {
      await extendAdminLicense({
        licenseId: selectedLicense.id,
        extensionDays,
        reason: reason.trim(),
      });
      setExtSuccess(`License ${selectedLicense.licenseNumber} extended by ${extensionDays} days!`);
      setSelectedLicense(null);
      setReason("");
      await loadLicenses();
    } catch (err: any) {
      setExtError(err.message || "Failed to extend license.");
    } finally {
      setExtending(false);
    }
  };

  return (
    <SaasAdminLayout>
      <div className="space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-white">License Management</h1>
          <p className="text-xs text-slate-400">View annual software licenses and perform audited administrative extensions</p>
        </div>

        {extSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{extSuccess}</span>
            </div>
            <button onClick={() => setExtSuccess(null)} className="font-bold underline text-emerald-400">Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Fetching licenses...</span>
          </div>
        ) : licenses.length > 0 ? (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <th className="py-4 px-6">License Number</th>
                    <th className="py-4 px-6">Customer & Company</th>
                    <th className="py-4 px-6">Tenant Slug</th>
                    <th className="py-4 px-6">Validity Dates</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {licenses.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-6 font-mono font-bold text-white tracking-wider">
                        {l.licenseNumber}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{l.saasUser?.customerProfile?.businessName || l.saasUser?.email}</div>
                        <div className="text-slate-400">{l.saasUser?.customerProfile?.contactPerson}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-emerald-400">
                        {l.company?.slug ? `${l.company.slug}.shabooagri.com` : "N/A"}
                      </td>
                      <td className="py-4 px-6">
                        <div>Start: {l.startDate ? new Date(l.startDate).toLocaleDateString() : "Pending"}</div>
                        <div className="text-emerald-400 font-semibold">
                          Expiry: {l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : "Pending"}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          l.status === "LICENSE_ACTIVE"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedLicense(l)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 ml-auto transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Extend</span>
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
            No license records found.
          </div>
        )}

        {/* EXTEND LICENSE MODAL */}
        {selectedLicense && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Extend License</h3>
                <span className="text-xs font-mono text-emerald-400">{selectedLicense.licenseNumber}</span>
              </div>

              {extError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{extError}</span>
                </div>
              )}

              <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    Extension Duration (Days)
                  </label>
                  <select
                    value={extensionDays}
                    onChange={(e) => setExtensionDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={7}>7 Days (Trial / Courtesy Extension)</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days (3 Months)</option>
                    <option value={365}>365 Days (1 Full Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">
                    Administrative Reason <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter explicit administrative audit reason for extending license..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLicense(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={extending}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {extending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Extension"}
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
