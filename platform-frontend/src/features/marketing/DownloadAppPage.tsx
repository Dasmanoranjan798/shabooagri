import React from "react";
import { Download, AlertTriangle, Info, CheckCircle2, Smartphone, Monitor } from "lucide-react";
import { MarketingLayout } from "../../components/MarketingLayout";

export const DownloadAppPage: React.FC = () => {
  return (
    <MarketingLayout>
      {() => (
        <>
          {/* Hero Section */}
          <section style={{ padding: "80px 24px 60px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
            <div
              style={{
                width: 80,
                height: 80,
                backgroundColor: "var(--color-primary)",
                color: "var(--color-text-inverse)",
                borderRadius: "var(--radius-lg)",
                margin: "0 auto 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                fontWeight: "bold",
              }}
            >
              SA
            </div>
            <h1 style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
              ShabooAgri Mobile App
            </h1>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 16px",
                backgroundColor: "#fef3c7",
                color: "#92400e",
                borderRadius: "20px",
                fontWeight: 600,
                fontSize: "0.9rem",
                marginBottom: 32,
              }}
            >
              <AlertTriangle size={18} />
              Preview / Test Version
            </div>
            <p style={{ color: "var(--color-text-muted)", marginBottom: 32 }}>
              ShabooAgri is one unified application for all your devices. Manage your farm operations seamlessly across mobile and desktop.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Android */}
              <div>
                <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <Smartphone size={20} />
                  Android
                </h3>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <a
                    href="/downloads/shabooagri-v0.8.10.apk"
                    download="shabooagri-v0.8.10.apk"
                    className="pf-btn pf-btn-primary"
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Download size={20} />
                    Download APK (v0.8.10)
                  </a>
                </div>
              </div>

              {/* iOS */}
              <div>
                <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <Smartphone size={20} />
                  iPhone / iPad
                </h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: 0 }}>
                  <em>v0.8.10 submission pending. Will be available via TestFlight / App Store.</em>
                </p>
              </div>

              {/* Windows */}
              <div>
                <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <Monitor size={20} />
                  Windows
                </h3>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <a
                    href="/downloads/ShabooAgri-Setup-x64.exe"
                    download="ShabooAgri-Setup-x64.exe"
                    className="pf-btn pf-btn-secondary"
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Download size={20} />
                    Download Windows Installer (.exe)
                  </a>
                </div>
              </div>

              {/* macOS */}
              <div>
                <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <Monitor size={20} />
                  macOS
                </h3>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <a
                    href="/downloads/shabooagri-macos.zip"
                    download="shabooagri-macos.zip"
                    className="pf-btn pf-btn-secondary"
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Download size={20} />
                    Download macOS App
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Details Section */}
          <section
            style={{
              maxWidth: 720,
              margin: "0 auto 80px",
              padding: "0 24px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
            }}
          >
            <div className="pf-card" style={{ padding: 32 }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Info size={24} color="var(--color-primary)" />
                What's New in v0.8.10
              </h2>
              <ul
                style={{
                  paddingLeft: 24,
                  margin: 0,
                  color: "var(--color-text-muted)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <li>Works offline: view your data and record payments, bookings and jobs with no internet — everything syncs automatically when you reconnect, with no duplicates or lost entries</li>
                <li>Fixed the Payments ledger getting stuck on "Loading…"</li>
                <li>Clearer sign-in: sign-in errors now tell you exactly what went wrong, and you can see and switch which company this device is connected to</li>
                <li>Live data everywhere: record a payment, booking or job and every open screen — dashboard KPIs, lists, ledgers, reports — updates instantly, no manual refresh</li>
                <li>Quick-login PIN and full sign-in parity with the web app: password, PIN, and OTP</li>
                <li>Performance &amp; bug fixes</li>
              </ul>
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  backgroundColor: "var(--color-bg)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.9rem",
                  color: "var(--color-text-muted)",
                  borderLeft: "4px solid #eab308",
                }}
              >
                <strong>Updated:</strong> 30 August 2026. This is the latest preview release.
              </div>
            </div>

            <div className="pf-card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 24 }}>How to Install</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary-dark)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    1
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 4px" }}>Download the file</h3>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-text-muted)" }}>
                      Tap the download button above and wait for the APK file to download to your phone.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary-dark)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    2
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 4px" }}>Open the file</h3>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-text-muted)" }}>
                      Tap "Open" when the download finishes, or find the file in your phone's "Downloads" folder.
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary-dark)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    3
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 4px" }}>Allow Unknown Sources</h3>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-text-muted)" }}>
                      If prompted, tap "Settings" and turn on "Allow from this source", then tap the back button and
                      press "Install".
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary-dark)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 4px" }}>Ready to use!</h3>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-text-muted)" }}>
                      The app is now installed and ready to test.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </MarketingLayout>
  );
};
