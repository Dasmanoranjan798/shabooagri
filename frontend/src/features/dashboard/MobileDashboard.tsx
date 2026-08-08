import React, { useState } from "react";
import type { DashboardSummaryResponse } from "../../types/dashboard";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { KpiCard } from "./KpiCard";
import { TodaysJobsTable } from "./TodaysJobsTable";
import { Card } from "../../components/ui/Card";

interface MobileDashboardProps {
  summary: DashboardSummaryResponse;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({ summary }) => {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const kpis = summary.kpis;
  const customerTerm = getTerm("customer");
  const bookingTerm = getTerm("booking");
  const machineTerm = getTerm("machine");

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const showQuickActionToast = (actionName: string) => {
    setToastMessage(`${actionName} - Action screen available in module rollout`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="sa-mobile-dashboard">
      {/* Toast notification */}
      {toastMessage && <div className="sa-toast">{toastMessage}</div>}

      {/* Greeting Banner */}
      <div className="sa-mobile-greeting">
        <div className="sa-greeting-text">
          <h2>Hello, {user?.fullName || "Partner"} 👋</h2>
          <span className="sa-greeting-date">{todayStr}</span>
        </div>
      </div>

      {/* 2x2 KPI Grid */}
      {kpis && summary.scope === "company" && (
        <div className="sa-mobile-kpi-grid">
          <KpiCard
            title="Today's Revenue"
            value={formatCurrency(kpis.todayRevenue.current)}
            icon="💰"
            delta={kpis.todayRevenue}
          />
          <KpiCard
            title="Today's Jobs"
            value={kpis.jobsCompleted.current}
            icon="✅"
            subtitle={`${summary.todaysJobs.length} scheduled`}
          />
          <KpiCard
            title="Pending Payment"
            value={formatCurrency(kpis.pendingCollection.current)}
            icon="⏳"
            badge={{ text: "Due", variant: "warning" }}
          />
          <KpiCard
            title={`${machineTerm} Working`}
            value={`${kpis.machinesWorking.working}/${kpis.machinesWorking.activeUsable}`}
            icon="🚜"
            badge={{ text: `${kpis.machinesWorking.percent}%`, variant: "success" }}
          />
        </div>
      )}

      {/* Quick Actions Row */}
      <div className="sa-quick-actions">
        <button
          className="sa-action-btn"
          onClick={() => showQuickActionToast(`New ${bookingTerm}`)}
        >
          <span className="sa-action-icon">➕</span>
          <span className="sa-action-label">New {bookingTerm}</span>
        </button>

        <button
          className="sa-action-btn"
          onClick={() => showQuickActionToast("Collect Payment")}
        >
          <span className="sa-action-icon">💳</span>
          <span className="sa-action-label">Collect Payment</span>
        </button>

        <button
          className="sa-action-btn"
          onClick={() => showQuickActionToast(`New ${customerTerm}`)}
        >
          <span className="sa-action-icon">👤</span>
          <span className="sa-action-label">New {customerTerm}</span>
        </button>

        <button
          className="sa-action-btn"
          onClick={() => showQuickActionToast("New Expense")}
        >
          <span className="sa-action-icon">🧾</span>
          <span className="sa-action-label">New Expense</span>
        </button>
      </div>

      {/* Today's Jobs List Section */}
      <Card
        title="Today's Jobs"
        subtitle={`${summary.todaysJobs.length} active assignments`}
        action={<span className="sa-link-action">See All →</span>}
      >
        <TodaysJobsTable jobs={summary.todaysJobs} isMobile={true} />
      </Card>
    </div>
  );
};
