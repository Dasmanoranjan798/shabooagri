import React, { useEffect, useState } from "react";
import "./bookings.css";
import {
  Calendar,
  Plus,
  AlertTriangle,
  RotateCcw,
  Pencil,
  Trash2,
  User,
  Tractor,
  UserCheck,
  Banknote
} from "lucide-react";
import type { Booking } from "../../types/booking";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../lib/theme";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { BookingFormModal } from "./BookingFormModal";
import { BookingDetailModal } from "./BookingDetailModal";

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "On the way", value: "ON_THE_WAY" },
  { label: "Working", value: "WORKING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export const BookingsPage: React.FC = () => {
  const { roleKey, hasPermission } = useAuth();
  const customerTerm = getTerm("customer");
  const villageTerm = getTerm("village");
  const machineTerm = getTerm("machine");
  const driverTerm = getTerm("driver");
  const bookingTerm = getTerm("booking", true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [selectedDetailBooking, setSelectedDetailBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = roleKey === "owner" || hasPermission("booking.create");
  const canDelete = roleKey === "owner" || hasPermission("booking.delete");
  const canEdit = roleKey === "owner" || hasPermission("booking.edit");

  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.listBookings();
      setBookings(list);

      // Refresh detail modal if open
      if (selectedDetailBooking) {
        const updated = list.find((b) => b.id === selectedDetailBooking.id);
        if (updated) setSelectedDetailBooking(updated);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleOpenCreate = () => {
    setEditingBooking(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBooking(booking);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (booking: Booking) => {
    setSelectedDetailBooking(booking);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this booking?")) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteBooking(id);
      loadBookings();
    } catch (err: any) {
      alert(err.message || "Failed to delete booking");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter bookings by status tab & search query
  const filteredBookings = bookings.filter((b) => {
    if (activeFilter !== "ALL" && b.status !== activeFilter) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      b.bookingNumber.toLowerCase().includes(q) ||
      b.customer.name.toLowerCase().includes(q) ||
      b.village.name.toLowerCase().includes(q) ||
      (b.machine && b.machine.registrationNumber.toLowerCase().includes(q)) ||
      (b.driver && b.driver.employee.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="sa-bookings-page">
      {/* Page Header */}
      <div className="sa-page-header">
        <div className="sa-page-header-text">
          <h2>{bookingTerm}</h2>
          <p>Schedule, assign equipment & track service operations</p>
        </div>

        {canCreate && (
          <Button variant="primary" size="md" onClick={handleOpenCreate} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} /> New {getTerm("booking")}
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="sa-toolbar">
        <div className="sa-filter-tabs">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.value}
              className={`sa-tab-btn ${activeFilter === tab.value ? "is-active" : ""}`}
              onClick={() => setActiveFilter(tab.value)}
            >
              {tab.label}
              {tab.value === "ALL" ? (
                <span className="sa-tab-count">({bookings.length})</span>
              ) : (
                <span className="sa-tab-count">
                  ({bookings.filter((b) => b.status === tab.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="sa-toolbar-search">
          <input
            type="text"
            className="sa-input sa-search-input"
            placeholder={`Search by #, ${customerTerm}, ${villageTerm}, ${machineTerm}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="sa-center-viewport">
          <Spinner size="lg" label={`Loading ${bookingTerm.toLowerCase()}...`} />
        </div>
      ) : error ? (
        <div className="sa-error-container">
          <div className="sa-error-card">
            <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={32} color="var(--color-error, #D32F2F)" />
            </span>
            <h3>Error Loading Bookings</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={loadBookings} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RotateCcw size={16} /> Retry
            </Button>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <div className="sa-empty-state">
            <span className="sa-empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={32} color="var(--color-text-muted)" />
            </span>
            <h3>No {bookingTerm} Found</h3>
            <p>
              {searchQuery || activeFilter !== "ALL"
                ? "No booking records match the selected filter criteria."
                : `No ${bookingTerm.toLowerCase()} created yet.`}
            </p>
            {canCreate && (
              <Button variant="primary" size="md" onClick={handleOpenCreate} style={{ marginTop: "1rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Plus size={16} /> Create First {getTerm("booking")}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="sa-desktop-only">
            <Card>
              <div className="sa-table-responsive">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Booking #</th>
                      <th>{customerTerm} & {villageTerm}</th>
                      <th>Scheduled Date</th>
                      <th>{machineTerm}</th>
                      <th>{driverTerm}</th>
                      <th>Status</th>
                      <th>Est. Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id} onClick={() => handleOpenDetail(b)} className="sa-clickable-row">
                        <td className="sa-td-bold">{b.bookingNumber}</td>
                        <td>
                          <div className="sa-cell-title">{b.customer.name}</div>
                          <div className="sa-cell-sub">{b.village.name}</div>
                        </td>
                        <td>
                          <div className="sa-cell-title">{b.scheduledDate.slice(0, 10)}</div>
                          <div className="sa-cell-sub">
                            {b.scheduledTime ? b.scheduledTime.slice(11, 16) : ""}
                          </div>
                        </td>
                        <td>
                          {b.machine ? (
                            <>
                              <div className="sa-cell-title">{b.machine.registrationNumber}</div>
                              <div className="sa-cell-sub">{b.machine.brand} {b.machine.model}</div>
                            </>
                          ) : (
                            <span className="sa-text-muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          {b.driver ? b.driver.employee.name : <span className="sa-text-muted">Unassigned</span>}
                        </td>
                        <td>
                          <Badge variant={getStatusBadgeVariant(b.status)} size="sm">
                            {b.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td>
                          <div className="sa-cell-title">
                            {b.estimatedAmount != null ? formatCurrency(b.estimatedAmount) : "N/A"}
                          </div>
                          <div className="sa-cell-sub">
                            {formatCurrency(b.rate)} / {b.pricingMethod.label}
                          </div>
                        </td>
                        <td>
                          <div className="sa-table-actions" onClick={(e) => e.stopPropagation()}>
                            {canEdit && (
                              <button
                                className="sa-icon-action"
                                title="Edit Booking"
                                onClick={(e) => handleOpenEdit(b, e)}
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="sa-icon-action"
                                title="Delete Booking"
                                disabled={deletingId === b.id}
                                onClick={(e) => handleDelete(b.id, e)}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Card List View (§11.4) */}
          <div className="sa-mobile-only">
            <div className="sa-mobile-booking-list">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="sa-mobile-booking-card"
                  onClick={() => handleOpenDetail(b)}
                >
                  <div className="sa-booking-card-top">
                    <div className="sa-booking-num">{b.bookingNumber}</div>
                    <Badge variant={getStatusBadgeVariant(b.status)} size="sm">
                      {b.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="sa-booking-card-main">
                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <User size={14} /> {customerTerm}:
                      </span>
                      <span className="sa-bcard-val">{b.customer.name} ({b.village.name})</span>
                    </div>

                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Tractor size={14} /> {machineTerm}:
                      </span>
                      <span className="sa-bcard-val">
                        {b.machine ? b.machine.registrationNumber : "Unassigned"}
                      </span>
                    </div>

                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <UserCheck size={14} /> {driverTerm}:
                      </span>
                      <span className="sa-bcard-val">
                        {b.driver ? b.driver.employee.name : "Unassigned"}
                      </span>
                    </div>

                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={14} /> Date:
                      </span>
                      <span className="sa-bcard-val">{b.scheduledDate.slice(0, 10)}</span>
                    </div>

                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Banknote size={14} /> Amount:
                      </span>
                      <span className="sa-bcard-val sa-amount-bold">
                        {b.estimatedAmount != null ? formatCurrency(b.estimatedAmount) : formatCurrency(b.rate)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Form Modal (Create / Edit) */}
      <BookingFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={loadBookings}
        bookingToEdit={editingBooking}
      />

      {/* Details & Workflow Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        booking={selectedDetailBooking}
        onUpdate={loadBookings}
      />
    </div>
  );
};
