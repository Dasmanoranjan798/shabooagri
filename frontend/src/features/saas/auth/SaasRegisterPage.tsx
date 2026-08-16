import React, { useState } from "react";
import "../saas.css";
import { Link, useNavigate } from "react-router-dom";
import { Tractor, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useSaasAuth } from "../../../context/SaasAuthContext";

export const SaasRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerSaas } = useSaasAuth();

  const [formData, setFormData] = useState({
    businessName: "",
    contactPerson: "",
    businessEmail: "",
    phone: "",
    gstin: "",
    businessType: "Tractor Owner",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (
      !formData.businessName.trim() ||
      !formData.contactPerson.trim() ||
      !formData.businessEmail.trim() ||
      !formData.phone.trim()
    ) {
      setErrorMsg("Please fill out all required business fields.");
      return;
    }

    if (formData.password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify your entry.");
      return;
    }

    setLoading(true);
    try {
      await registerSaas({
        businessName: formData.businessName.trim(),
        contactPerson: formData.contactPerson.trim(),
        email: formData.businessEmail.trim(),
        phone: formData.phone.trim(),
        gstin: formData.gstin.trim(),
        businessType: formData.businessType,
        password: formData.password,
      });
      navigate("/portal");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create business account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--saas-bg)] flex flex-col justify-between font-sans">
      
      {/* Top minimal brand header */}
      <header className="py-6 px-4 sm:px-8 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link to="/saas" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--saas-primary)] flex items-center justify-center text-white shadow-xs">
            <Tractor className="w-4.5 h-4.5" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">
            Shaboo<span className="text-[var(--saas-primary)]">Agri</span>
          </span>
        </Link>
      </header>

      {/* Centered Registration Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-[480px] bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
          
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Create your business account
            </h1>
            <p className="text-xs text-slate-500">
              Start managing your agricultural machinery business with ShabooAgri.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* BUSINESS INFORMATION SECTION */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                BUSINESS INFORMATION
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Kisan Agro Services"
                  className="w-full px-3.5 h-10 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 h-10 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    name="businessEmail"
                    value={formData.businessEmail}
                    onChange={handleChange}
                    placeholder="name@company.com"
                    className="w-full px-3.5 h-10 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="w-full px-3.5 h-10 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="21AAAAA0000A1Z5"
                    className="w-full px-3.5 h-10 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full px-3.5 h-10 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    <option value="Tractor Owner">Tractor Owner</option>
                    <option value="Custom Hiring Centre">Custom Hiring Centre</option>
                    <option value="Agricultural Contractor">Agricultural Contractor</option>
                    <option value="Equipment Rental">Equipment Rental</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ACCOUNT SECTION */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                ACCOUNT
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-3.5 pr-10 h-10 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 h-10 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 px-4 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account&hellip;</span>
                  </>
                ) : (
                  <span>Create business account</span>
                )}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600 space-y-1">
            <p>Already have an account?</p>
            <Link to="/saas/login" className="font-bold text-[var(--saas-primary)] hover:underline block">
              Sign In
            </Link>
          </div>

        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        © 2026 ShabooAgri. All rights reserved.
      </footer>
    </div>
  );
};
