import React from "react";
import { Download, Info, CheckCircle2, Smartphone, Monitor, Apple } from "lucide-react";
import { MarketingLayout } from "../../components/MarketingLayout";

const CHANGELOG = [
  "Customer list at a glance: every farmer now shows their address, phone and outstanding balance right on the card — no need to open each one",
  "Driver cards show worked hours and how much is still payable; open a driver to see a customer-by-customer work breakdown alongside earned, paid and remaining",
  "Machine cards show real working hours and maintenance status (due / overdue); open a machine to see which customers its hours came from",
  "Cleaner, faster screens: a compact search-and-add on every list, tidier invoice cards, and clearer, easier-to-read numbers on the dashboard",
  "One consistent colour language for money across the whole app — green for money coming in (what customers owe you), red for money going out (what you owe drivers)",
  "Performance & bug fixes",
];

const STEPS = [
  { n: "1", title: "Download the file", body: "Tap the Android download button and wait for the APK to finish downloading to your phone." },
  { n: "2", title: "Open the file", body: 'Tap "Open" when the download finishes, or find the file in your phone\'s "Downloads" folder.' },
  { n: "3", title: "Allow the install", body: 'If prompted, tap "Settings" and turn on "Allow from this source", then go back and press "Install".' },
];

const PlatformCard: React.FC<{
  icon: React.ElementType;
  name: string;
  children: React.ReactNode;
}> = ({ icon: Icon, name, children }) => (
  <div className="pf-card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
    <span className="pf-icon-chip">
      <Icon size={22} />
    </span>
    <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{name}</h3>
    <div style={{ marginTop: "auto", width: "100%", display: "flex", justifyContent: "center" }}>{children}</div>
  </div>
);

export const DownloadAppPage: React.FC = () => {
  return (
    <MarketingLayout>
      {() => (
        <>
          {/* ---- Hero ------------------------------------------------- */}
          <section
            style={{
              background: "radial-gradient(900px 400px at 50% -10%, #eaf5ee 0%, rgba(234,245,238,0) 60%), var(--color-bg)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            <div className="pf-container" style={{ padding: "72px var(--pf-pad-x) 40px", textAlign: "center" }}>
              <span className="pf-badge pf-badge-amber" style={{ marginBottom: 20 }}>
                Preview / Test Version
              </span>
              <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 2.9rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16 }}>
                Get the ShabooAgri app
              </h1>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-lg)", maxWidth: 560, margin: "0 auto" }}>
                One unified app for every device — manage your hiring center across mobile and desktop, online or off.
              </p>
            </div>

            {/* Platform grid */}
            <div
              className="pf-container pf-grid"
              style={{
                ["--pf-grid-min" as string]: "220px",
                gap: 18,
                padding: "0 var(--pf-pad-x) 64px",
              }}
            >
              <PlatformCard icon={Smartphone} name="Android">
                <a
                  href="/downloads/shabooagri-v0.8.17.apk"
                  download="shabooagri-v0.8.17.apk"
                  className="pf-btn pf-btn-primary"
                  style={{ textDecoration: "none", width: "100%" }}
                >
                  <Download size={18} />
                  APK (v0.8.17)
                </a>
              </PlatformCard>

              <PlatformCard icon={Monitor} name="Windows">
                <a
                  href="/downloads/ShabooAgri-Setup-x64.exe"
                  download="ShabooAgri-Setup-x64.exe"
                  className="pf-btn pf-btn-secondary"
                  style={{ textDecoration: "none", width: "100%" }}
                >
                  <Download size={18} />
                  Installer (.exe)
                </a>
              </PlatformCard>

              <PlatformCard icon={Apple} name="macOS">
                <a
                  href="/downloads/shabooagri-macos.zip"
                  download="shabooagri-macos.zip"
                  className="pf-btn pf-btn-secondary"
                  style={{ textDecoration: "none", width: "100%" }}
                >
                  <Download size={18} />
                  macOS App
                </a>
              </PlatformCard>

              <PlatformCard icon={Apple} name="iPhone / iPad">
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  Coming via TestFlight / App&nbsp;Store
                </span>
              </PlatformCard>
            </div>
          </section>

          {/* ---- Details --------------------------------------------- */}
          <section
            className="pf-container"
            style={{ maxWidth: 760, padding: "56px var(--pf-pad-x) 88px", display: "flex", flexDirection: "column", gap: 24 }}
          >
            <div className="pf-card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
                <Info size={22} color="var(--color-primary)" />
                What's New in v0.8.17
              </h2>
              <ul style={{ paddingLeft: 22, margin: 0, color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: 9, fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
                {CHANGELOG.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div
                style={{
                  marginTop: 22,
                  padding: "12px 16px",
                  background: "var(--color-bg-subtle)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-muted)",
                  borderLeft: "3px solid var(--color-primary)",
                }}
              >
                <strong>Updated 5 September 2026.</strong> Android is now v0.8.17. Windows and macOS are v0.8.16 (rebuild to follow); iOS is pending App&nbsp;Store / TestFlight submission.
              </div>
            </div>

            <div className="pf-card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 24 }}>Installing on Android</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {STEPS.map((s) => (
                  <div key={s.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        background: "var(--color-primary-light)",
                        color: "var(--color-primary-dark)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {s.n}
                    </span>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "3px 0 4px" }}>{s.title}</h3>
                      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>{s.body}</p>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      flexShrink: 0,
                      background: "var(--color-primary)",
                      color: "#fff",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircle2 size={17} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 3px" }}>Ready to use</h3>
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>The app is installed and ready to go.</p>
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
