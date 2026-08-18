import React from "react";
import { Download, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
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
            <p style={{ fontSize: "1.1rem", color: "var(--color-text-muted)", marginBottom: 32 }}>
              Take the power of ShabooAgri to the field. Manage jobs, sync offline data, and complete workflows
              directly from your Android device.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <a
                href="/downloads/shabooagri-v0.3.0.apk"
                download
                className="pf-btn pf-btn-primary"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "1.1rem",
                  padding: "14px 32px",
                }}
              >
                <Download size={22} />
                Download for Android
              </a>
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
                What's New in v0.3.0-preview
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
                <li>Owner/Manager now have full screens for Bookings, Machines, Drivers, Customers, Villages, Payments, and Employees — not just Jobs</li>
                <li>New menu (drawer) to navigate between all of these, matching the website</li>
                <li>Smaller, faster download — this build is a real release build (~19&nbsp;MB) instead of a debug build (~159&nbsp;MB)</li>
                <li>Company Setup step — connect this device to your company on first launch</li>
                <li>Real sign-in with your email/phone and password (no more mock login)</li>
                <li>Each role lands on its own home screen: Owner/Manager, Driver, or Farmer</li>
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
                <strong>Note:</strong> Google Play Store availability is coming later. This is an early preview
                strictly for testing purposes and is not the final product.
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
