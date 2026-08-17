import React, { useEffect, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Printer } from "lucide-react";
import "./reports.css";
import type { DashboardSummaryResponse, IncomeSeriesResponse, FuelSeriesResponse, TimeRange } from "../../types/dashboard";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { exportToExcel, exportToPdf } from "../../lib/exportUtils";
import { fmtCurrency, fmtDate } from "../../lib/format";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { IncomeOverviewChart } from "../../components/charts/IncomeOverviewChart";
import { FuelConsumptionChart } from "../../components/charts/FuelConsumptionChart";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
 { value: "7d", label: "Last 7 Days" },
 { value: "30d", label: "Last 30 Days" },
 { value: "90d", label: "Last 90 Days" },
 { value: "12m", label: "Last 12 Months" },
];

export const ReportsPage: React.FC = () => {
 const customerTerm = getTerm("customer");
 const villageTerm = getTerm("village");

 const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
 const [income, setIncome] = useState<IncomeSeriesResponse | null>(null);
 const [fuel, setFuel] = useState<FuelSeriesResponse | null>(null);
 const [timeRange, setTimeRange] = useState<TimeRange>("30d");
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const loadData = async (range: TimeRange) => {
 setIsLoading(true);
 setError(null);
 try {
 const [s, inc, fu] = await Promise.all([
 api.getDashboardSummary(),
 api.getIncomeSeries(range),
 api.getFuelSeries(range),
 ]);
 setSummary(s);
 setIncome(inc);
 setFuel(fu);
 } catch (err: any) {
 setError(err.message || "Failed to load report data");
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData(timeRange);
 }, []);

 const handleRangeChange = (range: TimeRange) => {
 setTimeRange(range);
 loadData(range);
 };

 const kpis = summary?.kpis;

 // Used only for the "Export Excel" revenue rows — chart rendering itself
 // reuses the same IncomeOverviewChart/FuelConsumptionChart components
 // Dashboard uses, instead of a second hand-rolled SVG renderer.
 const incomePoints = income
 ? income.data.map((d) => ({
 label: "date" in d ? fmtDate(d.date, { day: "2-digit", month: "short" }) : (d as any).month,
 value: (d as any).amount ?? 0,
 }))
 : [];

 return (
    <div className="sa-reports-page">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title"> Reports</h1>
          <p className="sa-page-subtitle">Financial summaries and operational metrics</p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="sa-segmented-control" role="group" aria-label="Time range">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`sa-segmented-option ${timeRange === opt.value ? "sa-segmented-option--active" : ""}`}
                onClick={() => handleRangeChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => exportToPdf(`Reports_Summary_${timeRange}`)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Printer size={16} /> Print / Save PDF
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                const cols = [
                  { header: "Date", key: "date" },
                  { header: "Revenue (₹)", key: "revenue" },
                ];
                const dataRows = incomePoints.map((p) => ({
                  date: p.label,
                  revenue: p.value,
                }));
                exportToExcel(`Revenue_Report_${timeRange}`, "Revenue Summary", cols, dataRows);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FileSpreadsheet size={16} /> Export Excel
            </Button>
          </div>
        </div>
      </div>

 {isLoading ? (
 <div className="sa-center-viewport">
 <Spinner size="lg" label="Generating report..." />
 </div>
 ) : error ? (
 <div className="sa-error-container">
 <div className="sa-error-card">
 <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
 <AlertTriangle size={32} color="var(--color-error, #D32F2F)" />
 </span>
 <h3>Error Loading Report</h3>
 <p>{error}</p>
 <Button variant="primary" onClick={() => loadData(timeRange)}>Retry</Button>
 </div>
 </div>
 ) : (
 <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

 {/* KPI summary row */}
 {kpis && (
 <div className="sa-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "16px" }}>
 {[
 { label: "Today's Revenue", value: fmtCurrency(kpis.todayRevenue.current), delta: kpis.todayRevenue.deltaPercent },
 { label: "This Month Revenue", value: fmtCurrency(kpis.monthRevenue.current), delta: kpis.monthRevenue.deltaPercent },
 { label: "Pending Collection", value: fmtCurrency(kpis.pendingCollection.current), delta: null },
 { label: "Jobs Completed", value: `${kpis.jobsCompleted.current}`, delta: kpis.jobsCompleted.deltaPercent },
 { label: "Drivers Active", value: `${kpis.driversActive.current}`, delta: kpis.driversActive.deltaPercent },
 {
 label: "Machines Working",
 value: `${kpis.machinesWorking.working} / ${kpis.machinesWorking.total}`,
 delta: null,
 },
 ].map((k) => (
 <div key={k.label} className="sa-kpi-card">
 <div className="sa-kpi-label">{k.label}</div>
 <div className="sa-kpi-value">{k.value}</div>
 {k.delta != null && (
 <div className={`sa-kpi-delta ${k.delta >= 0 ? "sa-kpi-delta--up" : "sa-kpi-delta--down"}`}>
 {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta).toFixed(1)}% vs prev period
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {/* Income chart */}
 <Card title="Income Overview">
 <IncomeOverviewChart data={income?.data || []} granularity={income?.granularity || "day"} />
 </Card>

 {/* Fuel chart */}
 <Card title="Fuel Consumption (Litres)">
 <FuelConsumptionChart data={fuel?.data || []} />
 </Card>

 {/* Pending payments table */}
 {summary?.pendingPayments && summary.pendingPayments.length > 0 && (
 <Card title={`Pending Payments (${summary.pendingPayments.length})`}>
 <div className="sa-table-responsive">
 <table className="sa-table">
 <thead>
 <tr>
 <th>Invoice</th>
 <th>{customerTerm}</th>
 <th>{villageTerm}</th>
 <th>Total</th>
 <th>Paid</th>
 <th>Balance</th>
 <th>Days Outstanding</th>
 </tr>
 </thead>
 <tbody>
 {summary.pendingPayments.map((p) => (
 <tr key={p.invoiceId}>
 <td>{p.invoiceNumber}</td>
 <td>{p.customerName}</td>
 <td>{p.villageName}</td>
 <td>{fmtCurrency(p.totalAmount)}</td>
 <td>{fmtCurrency(p.paidAmount)}</td>
 <td style={{ color: "var(--color-danger)", fontWeight: 600 }}>{fmtCurrency(p.balanceAmount)}</td>
 <td>{p.daysOutstanding}d</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )}
 </div>
 )}
 </div>
 );
};
