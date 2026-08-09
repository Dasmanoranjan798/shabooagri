import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tractor, User, Building, Phone, Mail, Lock, ArrowRight, Loader2, AlertCircle, Sparkles, MapPin } from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    contactPerson: "",
    businessName: "",
    phone: "",
    email: "",
    password: "",
    city: "",
    state: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { registerSaas } = useSaasAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.contactPerson.trim() || formData.contactPerson.length < 2) {
      setErrorMsg("Please enter your name as contact person.");
      return;
    }
    if (!formData.businessName.trim() || formData.businessName.length < 2) {
      setErrorMsg("Please enter your business or Custom Hiring Centre name.");
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await registerSaas({
        contactPerson: formData.contactPerson.trim(),
        businessName: formData.businessName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
      });

      navigate("/saas/portal");
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <SaasHeader />

      <main className="flex-1 flex items-center justify-center py-12 sm:py-20 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative z-10">
          
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
              <Tractor className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3" />
                ENTERPRISE COMMERCIAL ONBOARDING
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Create Business Account</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Register for ShabooAgri Enterprise OS — <strong className="text-emerald-400">₹4,999/yr incl 18% GST</strong>
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Contact Person Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh Singh"
                    className="w-full pl-10 pr-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Business / CHC Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <Building className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="e.g. Greenfields Custom Hiring"
                    className="w-full pl-10 pr-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-10 pr-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Commercial Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  City / Town
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Ludhiana / Karnal"
                    className="w-full pl-10 pr-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Punjab / Haryana"
                  className="w-full px-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Account Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-4 py-3 h-11 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>REGISTERING BUSINESS...</span>
                  </>
                ) : (
                  <>
                    <span>REGISTER COMMERCIAL ACCOUNT</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Already have a commercial account?{" "}
            <Link to="/saas/login" className="text-emerald-400 font-bold hover:text-emerald-300 underline underline-offset-4">
              Sign In Here
            </Link>
          </div>

        </div>
      </main>

      <SaasFooter />
    </div>
  );
};
