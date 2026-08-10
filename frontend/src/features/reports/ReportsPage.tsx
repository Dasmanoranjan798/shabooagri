import React, { useEffect, useState } from "react";
import "./reports.css";
import type { DashboardSummaryResponse, IncomeSeriesResponse, FuelSeriesResponse, TimeRange } from "../../types/dashboard";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";

function fmtCurrency(val: number) {
 return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
 return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
 { value: "7d", label: "Last 7 Days" },
 { value: "30d", label: "Last 30 Days" },
 { value: "90d", label: "Last 90 Days" },
 { value: "12m", label: "Last 12 Months" },
];

export const ReportsPage: React.FC = () => {
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

 // SVG mini-chart helpers
 const renderLineChart = (points: { label: string; value: number }[], color: string) => {
 if (points.length === 0) return <p style={{ color: "var(--color-text-muted)", padding: "16px" }}>No data for this period.</p>;
 const max = Math.max(...points.map((p) => p.value), 1);
 const width = 600;
 const height = 200;
 const pad = { top: 16, right: 16, bottom: 48, left: 64 };
 const innerW = width - pad.left - pad.right;
 const innerH = height - pad.top - pad.bottom;

 const xs = points.map((_, i) => pad.left + (i / Math.max(points.length - 1, 1)) * innerW);
 const ys = points.map((p) => pad.top + (1 - p.value / max) * innerH);

 const pathD = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
 const areaD = `${pathD} L ${xs[xs.length - 1].toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${xs[0].toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;

 return (
 <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxHeight: 200 }}>
 <defs>
 <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
 <stop offset="0%" stopColor={color} stopOpacity="0.25" />
 <stop offset="100%" stopColor={color} stopOpacity="0" />
 </linearGradient>
 </defs>
 {/* Grid lines */}
 {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
 const y = pad.top + frac * innerH;
 const val = max * (1 - frac);
 return (
 <g key={frac}>
 <line x1={pad.left} x2={pad.left + innerW} y1={y} y2={y} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
 <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">
 {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
 </text>
 </g>
 );
 })}
 {/* X labels (show every nth) */}
 {points.map((p, i) => {
 const step = Math.ceil(points.length / 8);
 if (i % step !== 0 && i !== points.length - 1) return null;
 return (
 <text key={i} x={xs[i]} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
 {p.label}
 </text>
 );
 })}
 {/* Area */}
 <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
 {/* Line */}
 <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
 {/* Points */}
 {xs.map((x, i) => (
 <circle key={i} cx={x} cy={ys[i]} r={3} fill={color} />
 ))}
 </svg>
 );
 };

 const incomePoints = income
 ? income.data.map((d) => ({
 label: "date" in d ? fmtDate(d.date) : (d as any).month,
 value: (d as any).amount ?? 0,
 }))
 : [];

 const fuelPoints = fuel
 ? fuel.data.map((d) => ({ label: fmtDate(d.date), value: d.litres }))
 : [];

 return (
 <div className="sa-page">
 <div className="sa-page-header">
 <div>
 <h1 className="sa-page-title"> Reports</h1>
 <p className="sa-page-subtitle">Financial summaries and operational metrics</p>
 </div>

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
 </div>

 {isLoading ? (
 <div className="sa-loading-state"><Spinner /><span>Generating report…</span></div>
 ) : error ? (
 <div className="sa-error-state">
 <p> {error}</p>
 <button className="sa-btn sa-btn-secondary" onClick={() => loadData(timeRange)}>Retry</button>
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
 {renderLineChart(incomePoints, "var(--color-primary)")}
 </Card>

 {/* Fuel chart */}
 <Card title="Fuel Consumption (Litres)">
 {renderLineChart(fuelPoints, "#f59e0b")}
 </Card>

 {/* Pending payments table */}
 {summary?.pendingPayments && summary.pendingPayments.length > 0 && (
 <Card title={`Pending Payments (${summary.pendingPayments.length})`}>
 <div className="sa-table-wrapper">
 <table className="sa-table">
 <thead>
 <tr>
 <th>Invoice</th>
 <th>Customer</th>
 <th>Village</th>
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
