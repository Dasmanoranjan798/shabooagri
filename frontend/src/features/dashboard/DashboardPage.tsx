import React, { useEffect, useState } from "react";
import type {
  DashboardSummaryResponse,
  FuelSeriesResponse,
  IncomeSeriesResponse,
  TimeRange,
} from "../../types/dashboard";
import { api } from "../../lib/api";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { DesktopDashboard } from "./DesktopDashboard";
import { MobileDashboard } from "./MobileDashboard";

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [incomeData, setIncomeData] = useState<IncomeSeriesResponse | null>(null);
  const [fuelData, setFuelData] = useState<FuelSeriesResponse | null>(null);

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
      const summaryRes = await api.getDashboardSummary();
      setSummary(summaryRes);

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
          <span className="sa-error-icon">⚠️</span>
          <h3>Dashboard Error</h3>
          <p>{error}</p>
          <Button variant="primary" onClick={loadSummary}>
            🔄 Retry Loading
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
