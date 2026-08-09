import React, { useState } from "react";
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SaasHeader />

      {/* HEADER SECTION */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Mail className="w-4 h-4" />
            <span>Commercial Contact & Support</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white">
            Get in Touch with ShabooAgri
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Have questions about our software, fleet onboarding, or enterprise pricing? Send us a message and our agricultural technology team will assist you.
          </p>
        </div>
      </section>

      {/* MAIN CONTACT CONTENT */}
      <section className="py-16 lg:py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* CONTACT DETAILS (5 cols) */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-2xl font-black text-white mb-3">ShabooAgri Commercial Office</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Our team supports agricultural equipment owners, CHC operators, and contractors across major agricultural belts in Punjab, Haryana, UP, MP, Rajasthan, and beyond.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Corporate Address</h3>
                    <p className="text-xs text-slate-300">ShabooAgri Software Solutions, GT Road Agri-Tech Complex, Ludhiana, Punjab - 141001, India</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Phone / WhatsApp</h3>
                    <p className="text-xs text-slate-300">+91 (800) SHABOO-AGRI / +91 98765 43210</p>
                    <p className="text-[11px] text-slate-500 mt-1">Mon - Sat: 8:00 AM - 7:00 PM IST</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Email Support</h3>
                    <p className="text-xs text-slate-300">support@shabooagri.com</p>
                    <p className="text-xs text-slate-300">sales@shabooagri.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTACT FORM (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900/90 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-6">Send Us a Commercial Message</h2>

              {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-sm flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      Your Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Ramesh Singh"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      Business / CHC Name
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Ramesh Custom Hiring Centre"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. ramesh@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Custom Enterprise Plan Enquiry for 25 Harvesters"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    Message Details <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your machinery fleet, location, and operational requirements..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>SUBMIT ENQUIRY</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
