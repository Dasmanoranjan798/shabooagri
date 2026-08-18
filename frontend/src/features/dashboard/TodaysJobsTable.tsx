import React from "react";
import { Calendar, User, Tractor, UserCheck, CreditCard } from "lucide-react";
import type { JobRow } from "../../types/dashboard";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";

interface TodaysJobsTableProps {
  jobs: JobRow[];
  isMobile?: boolean;
}

// Mirrors the Job Cards page: a NOT_STARTED card shows readiness
// (isReadyToStart), not the raw booking status, which now sits frozen at
// PENDING for most bookings under the new flow.
function displayStatusLabel(job: JobRow): string {
  if (job.jobStatus !== "NOT_STARTED") return job.jobStatus;
  return job.isReadyToStart ? "READY TO START" : "AWAITING MACHINE";
}

function displayStatusVariant(job: JobRow) {
  if (job.jobStatus !== "NOT_STARTED") return getStatusBadgeVariant(job.jobStatus);
  return job.isReadyToStart ? "success" : "warning";
}

export const TodaysJobsTable: React.FC<TodaysJobsTableProps> = ({ jobs, isMobile = false }) => {
  const customerTerm = getTerm("customer");
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");

  if (!jobs || jobs.length === 0) {
    return (
      <div className="sa-empty-state">
        <span className="sa-empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Calendar size={28} />
        </span>
        <p>No jobs scheduled for today.</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="sa-mobile-job-list">
        {jobs.map((job) => {
          return (
            <div key={job.jobId} className="sa-mobile-job-card">
              <div className="sa-job-card-header">
                <div className="sa-job-booking-num">{job.bookingNumber}</div>
                <Badge variant={displayStatusVariant(job)} size="sm">
                  {displayStatusLabel(job)}
                </Badge>
              </div>

              <div className="sa-job-card-body">
                <div className="sa-job-row">
                  <span className="sa-job-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <User size={14} /> {customerTerm}:
                  </span>
                  <span className="sa-job-val">{job.customer.name} ({job.customer.village})</span>
                </div>
                <div className="sa-job-row">
                  <span className="sa-job-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Tractor size={14} /> {machineTerm}:
                  </span>
                  <span className="sa-job-val">
                    {job.machine ? `${job.machine.registrationNumber} ${job.machine.brand ? `(${job.machine.brand})` : ""}` : "Unassigned"}
                  </span>
                </div>
                <div className="sa-job-row">
                  <span className="sa-job-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <UserCheck size={14} /> {driverTerm}:
                  </span>
                  <span className="sa-job-val">{job.driver ? job.driver.name : "Unassigned"}</span>
                </div>
                {job.invoice && (
                  <div className="sa-job-row">
                    <span className="sa-job-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CreditCard size={14} /> Amount:
                    </span>
                    <span className="sa-job-val sa-amount-bold">
                      {formatCurrency(job.invoice.totalAmount)}
                      {job.invoice.balanceAmount > 0 && (
                        <span className="sa-balance-due"> (Due: {formatCurrency(job.invoice.balanceAmount)})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="sa-table-responsive">
      <table className="sa-table">
        <thead>
          <tr>
            <th>Booking #</th>
            <th>{customerTerm} & Village</th>
            <th>{machineTerm}</th>
            <th>{driverTerm}</th>
            <th>Status</th>
            <th>Invoice Amount</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            return (
              <tr key={job.jobId}>
                <td className="sa-td-bold">{job.bookingNumber}</td>
                <td>
                  <div className="sa-cell-title">{job.customer.name}</div>
                  <div className="sa-cell-sub">{job.customer.village}</div>
                </td>
                <td>
                  {job.machine ? (
                    <>
                      <div className="sa-cell-title">{job.machine.registrationNumber}</div>
                      <div className="sa-cell-sub">
                        {job.machine.brand} {job.machine.model}
                      </div>
                    </>
                  ) : (
                    <span className="sa-text-muted">Unassigned</span>
                  )}
                </td>
                <td>{job.driver ? job.driver.name : <span className="sa-text-muted">Unassigned</span>}</td>
                <td>
                  <Badge variant={displayStatusVariant(job)} size="sm">
                    {displayStatusLabel(job)}
                  </Badge>
                </td>
                <td>
                  {job.invoice ? (
                    <div>
                      <div className="sa-cell-title">{formatCurrency(job.invoice.totalAmount)}</div>
                      {job.invoice.balanceAmount > 0 ? (
                        <span className="sa-text-danger">Bal: {formatCurrency(job.invoice.balanceAmount)}</span>
                      ) : (
                        <span className="sa-text-success">Paid</span>
                      )}
                    </div>
                  ) : (
                    <span className="sa-text-muted">Pending</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
