import React, { useEffect, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { MarketingLayout } from "../../components/MarketingLayout";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import { api, ApiError } from "../../lib/api";

export const ContactPage: React.FC = () => {
  const { user } = usePlatformAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.contactPerson);
      setEmail((prev) => prev || user.email);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.submitSupportRequest({ name, email, subject, message });
      setSuccessMsg(res.message);
      setSubject("");
      setMessage("");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to submit your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingLayout>
      {() => (
        <section style={{ padding: "60px 24px", maxWidth: 560, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 10 }}>Contact Us</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}>
              Questions, account issues, or anything else — send us a message and our team will get back to you.
            </p>
          </div>

          <div className="pf-card" style={{ padding: 28 }}>
            {errorMsg && <div className="pf-alert pf-alert-danger">{errorMsg}</div>}
            {successMsg && (
              <div className="pf-alert pf-alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="pf-field">
                <label className="pf-label" htmlFor="name">Your Name</label>
                <input
                  id="name"
                  className="pf-input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="pf-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  className="pf-input"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="message">Message</label>
                <textarea
                  id="message"
                  className="pf-input"
                  rows={6}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button type="submit" className="pf-btn pf-btn-primary" style={{ width: "100%" }} disabled={loading}>
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Mail size={14} /> support.shaboo@gmail.com
          </p>
        </section>
      )}
    </MarketingLayout>
  );
};
