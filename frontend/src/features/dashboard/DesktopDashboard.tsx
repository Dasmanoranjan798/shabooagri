import React from "react";
import type {
  DashboardSummaryResponse,
  FuelSeriesResponse,
  IncomeSeriesResponse,
  TimeRange,
} from "../../types/dashboard";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "./KpiCard";
import { TodaysJobsTable } from "./TodaysJobsTable";
import { PendingPaymentsList } from "./PendingPaymentsList";
import { IncomeOverviewChart } from "../../components/charts/IncomeOverviewChart";
import { MachineStatusDonut } from "../../components/charts/MachineStatusDonut";
import { FuelConsumptionChart } from "../../components/charts/FuelConsumptionChart";

interface DesktopDashboardProps {
  summary: DashboardSummaryResponse;
  incomeData: IncomeSeriesResponse | null;
  fuelData: FuelSeriesResponse | null;
  incomeRange: TimeRange;
  fuelRange: TimeRange;
  onIncomeRangeChange: (range: TimeRange) => void;
  onFuelRangeChange: (range: TimeRange) => void;
  isLoadingIncome: boolean;
  isLoadingFuel: boolean;
}

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({
  summary,
  incomeData,
  fuelData,
  incomeRange,
  fuelRange,
  onIncomeRangeChange,
  onFuelRangeChange,
  isLoadingIncome,
  isLoadingFuel,
}) => {
  const kpis = summary.kpis;
  const driverTerm = getTerm("driver", true);
  const machineTerm = getTerm("machine", true);

  const timeRanges: Array<{ label: string; value: TimeRange }> = [
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "90D", value: "90d" },
    { label: "12M", value: "12m" },
  ];

  return (
    <div className="sa-desktop-dashboard">
      {/* 6 KPI Cards Grid */}
      {kpis && (
        <div className="sa-kpi-grid-6">
          <KpiCard
            title="Today's Revenue"
            value={formatCurrency(kpis.todayRevenue.current)}
            subtitle="vs yesterday"
            delta={kpis.todayRevenue}
            icon="💰"
          />
          <KpiCard
            title="This Month Revenue"
            value={formatCurrency(kpis.monthRevenue.current)}
            subtitle="vs last month"
            delta={kpis.monthRevenue}
            icon="📈"
          />
          <KpiCard
            title="Pending Collection"
            value={formatCurrency(kpis.pendingCollection.current)}
            subtitle="Unpaid & Partial Invoices"
            icon="⏳"
            badge={{ text: "Outstanding", variant: "warning" }}
          />
          <KpiCard
            title={`${machineTerm} Working`}
            value={`${kpis.machinesWorking.working} / ${kpis.machinesWorking.activeUsable}`}
            subtitle={`${kpis.machinesWorking.percent}% of active fleet`}
            icon="🚜"
            badge={{ text: `${kpis.machinesWorking.percent}%`, variant: "success" }}
          />
          <KpiCard
            title={`${driverTerm} Active`}
            value={kpis.driversActive.current}
            subtitle="Deployed on site today"
            delta={kpis.driversActive}
            icon="👨‍🌾"
          />
          <KpiCard
            title="Jobs Completed"
            value={kpis.jobsCompleted.current}
            subtitle="Completed today"
            delta={kpis.jobsCompleted}
            icon="✅"
          />
        </div>
      )}

      {/* Main 2-Column Dashboard Grid */}
      <div className="sa-dashboard-layout">
        {/* Left Column (Primary Workflows & Line Chart) */}
        <div className="sa-dash-col-main">
          {/* Today's Jobs Table */}
          <Card
            title="Today's Jobs"
            subtitle="Scheduled equipment operations for today"
            action={<span className="sa-link-action">View All Jobs →</span>}
          >
            <TodaysJobsTable jobs={summary.todaysJobs} />
          </Card>

          {/* Income Overview Line Chart */}
          <Card
            title="Income Overview"
            subtitle="Payment receipts over time"
            action={
              <div className="sa-range-selector">
                {timeRanges.map((r) => (
                  <button
                    key={r.value}
                    className={`sa-range-btn ${incomeRange === r.value ? "is-active" : ""}`}
                    onClick={() => onIncomeRangeChange(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            }
          >
            <IncomeOverviewChart
              data={incomeData?.data || []}
              granularity={incomeData?.granularity || "day"}
              isLoading={isLoadingIncome}
            />
          </Card>
        </div>

        {/* Right Column (Fleet Donut, Pending List & Fuel Chart) */}
        <div className="sa-dash-col-side">
          {/* Machine Status Donut Chart */}
          <Card title={`${getTerm("machine")} Status`} subtitle="Fleet availability & status breakdown">
            <MachineStatusDonut statusCounts={summary.machineStatus} />
          </Card>

          {/* Pending Payments List */}
          <Card
            title="Pending Payments"
            subtitle="Invoices awaiting collection"
            action={<span className="sa-link-action">View All Invoices →</span>}
          >
            <PendingPaymentsList payments={summary.pendingPayments} />
          </Card>

          {/* Fuel Consumption Bar Chart */}
          <Card
            title="Fuel Consumption"
            subtitle="Litres consumed per date range"
            action={
              <div className="sa-range-selector">
                {timeRanges.map((r) => (
                  <button
                    key={r.value}
                    className={`sa-range-btn ${fuelRange === r.value ? "is-active" : ""}`}
                    onClick={() => onFuelRangeChange(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            }
          >
            <FuelConsumptionChart data={fuelData?.data || []} isLoading={isLoadingFuel} />
          </Card>
        </div>
      </div>
    </div>
  );
};
