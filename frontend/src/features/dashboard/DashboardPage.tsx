import React, { useEffect, useState } from "react";
import "./dashboard.css";
import { AlertTriangle, RotateCcw, Wrench, ShieldAlert, BadgeAlert } from "lucide-react";
import type {
  DashboardSummaryResponse,
  FuelSeriesResponse,
  IncomeSeriesResponse,
  TimeRange,
} from "../../types/dashboard";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { getMachineServiceWarning, getMachineInsuranceWarning, getDriverLicenseWarning } from "../../lib/operationalWarnings";
import { DesktopDashboard } from "./DesktopDashboard";
import { MobileDashboard } from "./MobileDashboard";

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [incomeData, setIncomeData] = useState<IncomeSeriesResponse | null>(null);
  const [fuelData, setFuelData] = useState<FuelSeriesResponse | null>(null);

  const [opsWarnings, setOpsWarnings] = useState<{
    serviceCount: number;
    insuranceCount: number;
    licenseCount: number;
  }>({ serviceCount: 0, insuranceCount: 0, licenseCount: 0 });

  const [incomeRange, setIncomeRange] = useState<TimeRange>("30d");
  const [fuelRange, setFuelRange] = useState<TimeRange>("30d");

  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  const [isLoadingIncome, setIsLoadingIncome] = useState<boolean>(false);
  const [isLoadingFuel, setIsLoadingFuel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadSummary = async () => {
    setIsLoadingSummary(true);
    setError(null);
    try {
      const [summaryRes, machines, drivers, company] = await Promise.all([
        api.getDashboardSummary(),
        api.listMachines().catch(() => []),
        api.listDrivers().catch(() => []),
        api.getCompanyProfile().catch(() => null),
      ]);
      setSummary(summaryRes);

      const serviceCount = machines.filter((m) => getMachineServiceWarning(m, company).hasWarning).length;
      const insuranceCount = machines.filter((m) => getMachineInsuranceWarning(m, company).hasWarning).length;
      const licenseCount = drivers.filter((d) => getDriverLicenseWarning(d, company).hasWarning).length;

      setOpsWarnings({ serviceCount, insuranceCount, licenseCount });

      if (summaryRes.scope === "company") {
        loadIncomeSeries(incomeRange);
        loadFuelSeries(fuelRange);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const loadIncomeSeries = async (range: TimeRange) => {
    setIsLoadingIncome(true);
    try {
      const data = await api.getIncomeSeries(range);
      setIncomeData(data);
    } catch (err: any) {
      console.error("Income series error:", err);
    } finally {
      setIsLoadingIncome(false);
    }
  };

  const loadFuelSeries = async (range: TimeRange) => {
    setIsLoadingFuel(true);
    try {
      const data = await api.getFuelSeries(range);
      setFuelData(data);
    } catch (err: any) {
      console.error("Fuel series error:", err);
    } finally {
      setIsLoadingFuel(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleIncomeRangeChange = (range: TimeRange) => {
    setIncomeRange(range);
    loadIncomeSeries(range);
  };

  const handleFuelRangeChange = (range: TimeRange) => {
    setFuelRange(range);
    loadFuelSeries(range);
  };

  if (isLoadingSummary) {
    return (
      <div className="sa-center-viewport">
        <Spinner size="lg" label="Loading Dashboard metrics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="sa-error-container">
        <div className="sa-error-card">
          <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={36} color="var(--color-error, #D32F2F)" />
          </span>
          <h3>Dashboard Error</h3>
          <p>{error}</p>
          <Button variant="primary" onClick={loadSummary} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RotateCcw size={16} /> Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="sa-center-viewport">
        <p>No dashboard data available.</p>
      </div>
    );
  }

  return (
    <div className="sa-dashboard-page">
      {(opsWarnings.serviceCount > 0 || opsWarnings.insuranceCount > 0 || opsWarnings.licenseCount > 0) && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-warning-border, #ffe58f)", borderRadius: "10px", padding: "14px 18px", marginBottom: "18px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#d97706", display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <AlertTriangle size={18} /> Operational Fleet & Staff Warning Alerts
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "0.85rem", color: "var(--color-text-main)" }}>
            {opsWarnings.serviceCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef3c7", color: "#b45309", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>
                <Wrench size={14} /> {opsWarnings.serviceCount} Equipment Service Due Soon
              </span>
            )}
            {opsWarnings.insuranceCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef3c7", color: "#b45309", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>
                <ShieldAlert size={14} /> {opsWarnings.insuranceCount} Machine Document / Insurance Expiring
              </span>
            )}
            {opsWarnings.licenseCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef3c7", color: "#b45309", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>
                <BadgeAlert size={14} /> {opsWarnings.licenseCount} Driver License Expiring
              </span>
            )}
          </div>
        </div>
      )}

      {isMobile ? (
        <MobileDashboard summary={summary} />
      ) : (
        <DesktopDashboard
          summary={summary}
          incomeData={incomeData}
          fuelData={fuelData}
          incomeRange={incomeRange}
          fuelRange={fuelRange}
          onIncomeRangeChange={handleIncomeRangeChange}
          onFuelRangeChange={handleFuelRangeChange}
          isLoadingIncome={isLoadingIncome}
          isLoadingFuel={isLoadingFuel}
        />
      )}
    </div>
  );
};
