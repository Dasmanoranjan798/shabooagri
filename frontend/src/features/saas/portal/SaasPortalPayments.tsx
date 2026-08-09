import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { getSaasMyPayments } from "../../../lib/saasApi";
import type { SaasPayment } from "../../../types/saas";

export const SaasPortalPayments: React.FC = () => {
  const [payments, setPayments] = useState<SaasPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayments() {
      try {
        const data = await getSaasMyPayments();
        setPayments(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load payment history.");
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, []);

  return (
    <SaasPortalLayout>
      <div className="space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-white">Commercial Payment History</h1>
          <p className="text-xs text-slate-400">View all commercial SaaS subscription payments and GST tax breakdown</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading payment ledger...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        ) : payments.length > 0 ? (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Method</th>
                    <th className="py-4 px-6">Reference ID</th>
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
                      <td className="py-4 px-6 font-semibold">{p.paymentMethod || "UPI / BANK"}</td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">
                        {p.paymentReference || p.gatewayPaymentId || "N/A"}
                      </td>
                      <td className="py-4 px-6 font-mono">₹{Number(p.baseAmount).toFixed(2)}</td>
                      <td className="py-4 px-6 font-mono text-emerald-400">₹{Number(p.gstAmount).toFixed(2)}</td>
                      <td className="py-4 px-6 font-bold text-white font-mono">₹{Number(p.totalAmount).toFixed(2)}</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold uppercase">
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
          <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">No Payment Records Yet</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Commercial payments recorded for your SaaS account will appear here along with GST invoices and tax references.
            </p>
          </div>
        )}

      </div>
    </SaasPortalLayout>
  );
};
