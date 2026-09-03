import { useEffect, useState } from "react";
import { Spinner } from "../components/ui/Spinner";

type TenantState = "checking" | "valid" | "notfound";

// Gates the ENTIRE web app on whether the current subdomain actually maps to a
// company. The backend resolves the tenant from the Host header: a real
// company's `/auth/me` (with no token) returns 401 "Missing access token",
// while a subdomain with no company returns 404 "Tenant Not Found". So a single
// no-token GET /auth/me on load cleanly tells the two apart.
//
// Effect: only subdomains that have a real company (today just `pilot`, and any
// companies created once public sign-up is opened) show the app; every other
// `*.shabooagri.com` address shows the not-found screen instead of a login
// form. No nginx change and nothing to toggle at launch — it follows whatever
// companies exist. Fails OPEN on a network error so a real tenant is never
// locked out by a transient blip (the API still rejects invalid tenants on
// every call regardless).
export function TenantGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TenantState>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/auth/me", { headers: { Accept: "application/json" } });
        if (cancelled) return;
        setState(res.status === 404 ? "notfound" : "valid");
      } catch {
        if (!cancelled) setState("valid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="sa-center-viewport">
        <Spinner size="lg" label="Loading…" />
      </div>
    );
  }

  if (state === "notfound") {
    return <TenantNotFound />;
  }

  return <>{children}</>;
}

function TenantNotFound() {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        background: "#f7f8f7",
      }}
    >
      <div style={{ maxWidth: 460 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
        <h1 style={{ margin: "0 0 8px", fontSize: "1.4rem", color: "#1f2d1f" }}>This address isn’t available</h1>
        <p style={{ margin: "0 0 6px", color: "#555", lineHeight: 1.5 }}>
          There is no ShabooAgri account at <b>{host}</b>.
        </p>
        <p style={{ margin: "0 0 20px", color: "#777", fontSize: "0.9rem", lineHeight: 1.5 }}>
          The application is not open for public sign-up yet. If you believe this is a mistake, please contact
          ShabooAgri.
        </p>
        <a
          href="https://shabooagri.com"
          style={{
            display: "inline-block",
            padding: "10px 18px",
            background: "#2e7d32",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Go to shabooagri.com
        </a>
      </div>
    </div>
  );
}
