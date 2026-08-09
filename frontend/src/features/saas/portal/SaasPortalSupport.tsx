import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2, Phone, Mail } from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { useSaasAuth } from "../../../context/SaasAuthContext";
import { submitContactEnquiry } from "../../../lib/saasApi";

export const SaasPortalSupport: React.FC = () => {
  const { saasUser } = useSaasAuth();
  const profile = saasUser?.customerProfile;

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!subject.trim()) {
      setErrorMsg("Please enter a subject.");
      return;
    }
    if (!message.trim() || message.length < 10) {
      setErrorMsg("Message must be at least 10 characters long.");
      return;
    }

    setLoading(true);
    try {
      await submitContactEnquiry({
        name: profile?.contactPerson || saasUser?.email || "Customer",
        businessName: profile?.businessName || undefined,
        phone: profile?.phone || "9876543210",
        email: saasUser?.email || "customer@example.com",
        subject: `[CUSTOMER SUPPORT] ${subject.trim()}`,
        message: message.trim(),
      });

      setSuccessMsg("Your support ticket has been logged successfully. Our team will get back to you shortly.");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit support enquiry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SaasPortalLayout>
      <div className="space-y-6 max-w-4xl">
        
        <div>
          <h1 className="text-2xl font-black text-white">Contact & Support</h1>
          <p className="text-xs text-slate-400">Get technical assistance for your ShabooAgri software deployment</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-7 bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-5">
            <h2 className="text-lg font-bold text-white">Submit a Support Ticket</h2>

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
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Subject / Issue Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Assistance needed with machine hours reporting"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Support Details <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question in detail..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Ticket...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>SUBMIT SUPPORT TICKET</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">Direct Support Contact</h3>
              
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>+91 (800) SHABOO-AGRI</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>support@shabooagri.com</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
                Support hours: Monday through Saturday, 8:00 AM to 7:00 PM IST. Priority support for harvest season emergencies.
              </p>
            </div>
          </div>

        </div>

      </div>
    </SaasPortalLayout>
  );
};
