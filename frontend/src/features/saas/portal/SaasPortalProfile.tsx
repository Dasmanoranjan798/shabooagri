import React, { useEffect, useState } from "react";
import { Building, Phone, Mail, MapPin, FileText, Loader2, AlertCircle, KeyRound } from "lucide-react";
import { SaasPortalLayout } from "../components/SaasPortalLayout";
import { getSaasCustomerProfile, changeSaasPassword, SaasApiError } from "../../../lib/saasApi";
import type { SaasCustomerProfile } from "../../../types/saas";

const SaasChangePasswordSection: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await changeSaasPassword(currentPassword, newPassword);
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof SaasApiError ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-6">
      <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Change Password</h2>
          <p className="text-xs text-slate-400">Update the password used to sign in to your account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {saved && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-sm">
            Password changed successfully.
          </div>
        )}

        <div>
          <label className="text-xs font-bold uppercase text-slate-400">Current Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-400">New Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-400">Confirm New Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-sm transition-colors"
        >
          {saving ? "Updating…" : "Change Password"}
        </button>
      </form>
    </div>
  );
};

export const SaasPortalProfile: React.FC = () => {
  const [profile, setProfile] = useState<SaasCustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getSaasCustomerProfile();
        setProfile(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load business profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  return (
    <SaasPortalLayout>
      <div className="space-y-6">
        
        <div>
          <h1 className="text-2xl font-black text-white">Commercial Business Profile</h1>
          <p className="text-xs text-slate-400">View and verify your commercial entity details and GST tax information</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading business profile...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        ) : profile ? (
          <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 space-y-6">
            
            <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{profile.businessName}</h2>
                <p className="text-xs text-slate-400">Contact Person: <strong className="text-slate-200">{profile.contactPerson}</strong></p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Phone Number</span>
                </div>
                <p className="text-base font-bold text-white">{profile.phone}</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Email Address</span>
                </div>
                <p className="text-base font-bold text-white">{profile.email}</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>State & Region</span>
                </div>
                <p className="text-base font-bold text-white">{profile.state || "Not Specified"}, {profile.city || ""}</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>GSTIN / Tax Identification</span>
                </div>
                <p className="text-base font-bold text-white font-mono">{profile.gstin || "N/A (Not Provided)"}</p>
              </div>

            </div>

          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">
            No business profile details available.
          </div>
        )}

        <SaasChangePasswordSection />

      </div>
    </SaasPortalLayout>
  );
};
