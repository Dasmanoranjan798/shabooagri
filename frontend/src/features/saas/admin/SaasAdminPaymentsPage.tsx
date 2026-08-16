import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { SaasAdminLayout } from "./SaasAdminLayout";
import { getAdminPayments } from "../../../lib/saasApi";

export const SaasAdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPayments = async (filter?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const statusParam = filter && filter !== "ALL" ? filter : undefined;
      const data = await getAdminPayments(statusParam);
      setPayments(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(statusFilter);
  }, [statusFilter]);

  return (
    <SaasAdminLayout>
      <div className="space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Commercial Payment Ledger</h1>
            <p className="text-xs text-slate-400">View real payment records, gateway order IDs, and GST tax breakdowns</p>
          </div>

          {/* STATUS FILTER TABS */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {["ALL", "SUCCESS", "PENDING", "FAILED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  statusFilter === st
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading payment records...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-6 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>{errorMsg}</p>
              <button
                type="button"
                onClick={() => loadPayments(statusFilter)}
                className="px-3 py-1.5 rounded-lg bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs font-bold hover:bg-rose-900"
              >
                Retry
              </button>
            </div>
          </div>
        ) : payments.length > 0 ? (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Customer / Business</th>
                    <th className="py-4 px-6">Gateway Order ID</th>
                    <th className="py-4 px-6">Base Amount</th>
                    <th className="py-4 px-6">GST Tax</th>
                    <th className="py-4 px-6">Total Amount</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-6 font-medium text-white">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">
                          {p.saasUser?.customerProfile?.businessName || p.saasUser?.email}
                        </div>
                        <div className="text-slate-400">{p.saasUser?.customerProfile?.contactPerson}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-[11px] text-slate-400">
                        {p.gatewayOrderId || "N/A"}
                      </td>
                      <td className="py-4 px-6 font-mono">₹{Number(p.baseAmount).toFixed(2)}</td>
                      <td className="py-4 px-6 font-mono text-emerald-400">₹{Number(p.gstAmount).toFixed(2)}</td>
                      <td className="py-4 px-6 font-bold text-white font-mono">₹{Number(p.totalAmount).toFixed(2)}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === "SUCCESS"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : p.status === "PENDING"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            No payment records found for filter '{statusFilter}'.
          </div>
        )}

      </div>
    </SaasAdminLayout>
  );
};
