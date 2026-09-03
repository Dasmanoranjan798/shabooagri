import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Tractor, Smartphone } from "lucide-react";

// Minimal commercial-platform handoff page (NOT an operational app). ShabooAgri
// operational users live in the Flutter app; the emailed password-reset and
// staff-invite links are Android App Links that open that app directly when it
// is installed. When they don't (iOS, desktop, an uninstalled/unverified
// device), the link lands here — we point the user at the app / download page
// and show the one-time token to paste into the app's own Reset/Accept screen,
// which already accepts it. No operational business logic runs here.
export const AppHandoff: React.FC<{
  kind: "reset" | "invite";
  token: string;
  email?: string;
  tenant?: string;
}> = ({ kind, token, email, tenant }) => {
  const [copied, setCopied] = useState(false);
  const title = kind === "reset" ? "Reset your password in the app" : "Accept your invite in the app";
  const action = kind === "reset" ? "Reset Password" : "Accept Invite";

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the code is shown for manual copy */
    }
  };

  return (
    <div className="pf-center-viewport">
      <div className="pf-card" style={{ width: "100%", maxWidth: 460, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Tractor size={26} color="var(--color-primary)" />
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>ShabooAgri</h1>
        </div>

        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 6 }}>{title}</h2>
        <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginTop: 0 }}>
          ShabooAgri now runs as an app on Android, iOS, Windows and macOS. If you opened this
          link on a device with the app installed, it should have opened automatically. If it
          didn't, follow these steps:
        </p>

        <ol style={{ fontSize: "0.9rem", lineHeight: 1.7, paddingLeft: 18 }}>
          <li>Open the ShabooAgri app (or install it below).</li>
          <li>
            Choose <strong>{action}</strong>
            {email ? <> for <strong>{email}</strong></> : null}.
          </li>
          <li>Paste this one-time code:</li>
        </ol>

        <div
          onClick={copyToken}
          title="Click to copy"
          style={{
            fontFamily: "monospace",
            fontSize: "0.85rem",
            wordBreak: "break-all",
            background: "#f4fbf6",
            border: "1px solid #d7ecd9",
            borderRadius: 6,
            padding: 12,
            cursor: "pointer",
            color: "#1B7A3E",
          }}
        >
          {token}
        </div>
        <button className="pf-btn pf-btn-secondary" style={{ width: "100%", marginTop: 8 }} onClick={copyToken}>
          {copied ? "Copied ✓" : "Copy code"}
        </button>

        <a
          href="/app"
          className="pf-btn pf-btn-primary"
          style={{ width: "100%", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}
        >
          <Smartphone size={16} /> Get the ShabooAgri app
        </a>

        {tenant ? (
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: 14, textAlign: "center" }}>
            Company ID: <strong>{tenant}</strong>
          </p>
        ) : null}
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: 6, textAlign: "center" }}>
          This code expires soon and can be used once. If you didn't request it, you can ignore this page.
        </p>
        <p style={{ fontSize: "0.85rem", marginTop: 10, textAlign: "center" }}>
          <Link to="/" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Back to shabooagri.com</Link>
        </p>
      </div>
    </div>
  );
};
