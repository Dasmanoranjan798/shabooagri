import React, { useState } from "react";
import "../saas.css";
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";
import { submitContactEnquiry } from "../../../lib/saasApi";

export const SaasContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!formData.name.trim() || formData.name.length < 2) {
      setErrorMsg("Please enter your full name.");
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
    if (!formData.subject.trim()) {
      setErrorMsg("Please provide an enquiry subject.");
      return;
    }
    if (!formData.message.trim() || formData.message.length < 10) {
      setErrorMsg("Message must be at least 10 characters long.");
      return;
    }

    setLoading(true);
    try {
      await submitContactEnquiry({
        name: formData.name,
        businessName: formData.businessName || undefined,
        phone: formData.phone,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });

      setSuccessMsg("Thank you! Your enquiry has been received. Our team will contact you shortly.");
      setFormData({
        name: "",
        businessName: "",
        phone: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send message. Please check network and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--saas-bg)] text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* Hero Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] text-xs font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" />
            <span>Commercial Contact & Support</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Get in Touch with ShabooAgri
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Have questions about our software, fleet onboarding, or enterprise pricing? Send us a message and our agricultural technology team will assist you.
          </p>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Contact Details (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">ShabooAgri Commercial Office</h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Our team supports agricultural equipment owners, CHC operators, and contractors across major agricultural belts in Punjab, Haryana, UP, MP, Odisha, Rajasthan, and beyond.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">Corporate Address</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">ShabooAgri Software Solutions, Bhubaneswar / Cuttack Agri-Tech Hub, Odisha - 751001, India</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">Phone / WhatsApp</h3>
                    <p className="text-xs text-slate-600">+91 94370 00000</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Mon - Sat: 8:00 AM - 7:00 PM IST</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">Email Support</h3>
                    <p className="text-xs text-slate-600">support@shabooagri.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Send Us a Commercial Message</h2>

              {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--saas-primary)] shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Ramesh Singh"
                      className="w-full px-4 py-2.5 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Business / CHC Name
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Greenfields CHC"
                      className="w-full px-4 py-2.5 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-2.5 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. ramesh@example.com"
                      className="w-full px-4 py-2.5 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Enterprise Plan Enquiry for 25 Harvesters"
                    className="w-full px-4 py-2.5 h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Message Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your machinery fleet, location, and operational requirements..."
                    className="w-full p-4 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--saas-primary)] focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 px-4 rounded-lg bg-[var(--saas-primary)] hover:bg-[var(--saas-primary-hover)] text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Commercial Enquiry</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
