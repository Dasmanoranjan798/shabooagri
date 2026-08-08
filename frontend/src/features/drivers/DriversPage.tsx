import React, { useEffect, useState } from "react";
import type { Driver } from "../../types/driver";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { DriverFormModal } from "./DriverFormModal";
import { DriverDetailModal } from "./DriverDetailModal";

const DRIVER_STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "ALL" },
  { label: "Available", value: "AVAILABLE" },
  { label: "On Job", value: "ON_JOB" },
  { label: "Off Duty", value: "OFF_DUTY" },
];

export const DriversPage: React.FC = () => {
  const { roleKey, hasPermission } = useAuth();
  const driverTerm = getTerm("driver", true);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [selectedDetailDriver, setSelectedDetailDriver] = useState<Driver | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManage = roleKey === "owner" || hasPermission("driver.manage");

  const loadDrivers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.listDrivers();
      setDrivers(list);

      // Refresh detail modal if open
      if (selectedDetailDriver) {
        const updated = list.find((d) => d.id === selectedDetailDriver.id);
        if (updated) setSelectedDetailDriver(updated);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load drivers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const handleOpenCreate = () => {
    setEditingDriver(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (driver: Driver, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDriver(driver);
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (driver: Driver) => {
    setSelectedDetailDriver(driver);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete this ${getTerm("driver")} profile?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteDriver(id);
      setIsDetailModalOpen(false);
      loadDrivers();
    } catch (err: any) {
      alert(err.message || "Failed to delete driver profile");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter drivers by availability status & search query
  const filteredDrivers = drivers.filter((d) => {
    if (activeFilter !== "ALL" && d.availabilityStatus !== activeFilter) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const name = (d.employee?.name || "").toLowerCase();
    const desig = (d.employee?.designation || "").toLowerCase();
    const phone = (d.employee?.phone || "").toLowerCase();
    const license = (d.licenseNumber || "").toLowerCase();

    return name.includes(q) || desig.includes(q) || phone.includes(q) || license.includes(q);
  });

  return (
    <div className="sa-drivers-page">
      {/* Page Header */}
      <div className="sa-page-header">
        <div className="sa-page-header-text">
          <h2>{driverTerm} Directory</h2>
          <p>Manage operator profiles, licenses, availability & job assignments</p>
        </div>

        {canManage && (
          <Button variant="primary" size="md" onClick={handleOpenCreate}>
            ➕ Add {getTerm("driver")}
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="sa-toolbar">
        <div className="sa-filter-tabs">
          {DRIVER_STATUS_FILTERS.map((tab) => (
            <button
              key={tab.value}
              className={`sa-tab-btn ${activeFilter === tab.value ? "is-active" : ""}`}
              onClick={() => setActiveFilter(tab.value)}
            >
              {tab.label}
              {tab.value === "ALL" ? (
                <span className="sa-tab-count">({drivers.length})</span>
              ) : (
                <span className="sa-tab-count">
                  ({drivers.filter((d) => d.availabilityStatus === tab.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="sa-toolbar-search">
          <input
            type="text"
            className="sa-input sa-search-input"
            placeholder={`Search by Name, License, Phone...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="sa-center-viewport">
          <Spinner size="lg" label={`Loading ${driverTerm.toLowerCase()}...`} />
        </div>
      ) : error ? (
        <div className="sa-error-container">
          <div className="sa-error-card">
            <span className="sa-error-icon">⚠️</span>
            <h3>Error Loading Drivers</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={loadDrivers}>
              🔄 Retry
            </Button>
          </div>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <Card>
          <div className="sa-empty-state">
            <span className="sa-empty-icon">👨‍🌾</span>
            <h3>No {driverTerm} Profiles Found</h3>
            <p>
              {searchQuery || activeFilter !== "ALL"
                ? "No driver records match the selected filter criteria."
                : `No ${driverTerm.toLowerCase()} profiles registered yet.`}
            </p>
            {canManage && (
              <Button variant="primary" size="md" onClick={handleOpenCreate} style={{ marginTop: "1rem" }}>
                ➕ Create First {getTerm("driver")} Profile
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
                      <th>{getTerm("driver")} Name</th>
                      <th>Designation</th>
                      <th>Phone</th>
                      <th>License Number</th>
                      <th>License Expiry</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => handleOpenDetail(d)}
                        className="sa-clickable-row"
                      >
                        <td className="sa-td-bold">👨‍🌾 {d.employee.name}</td>
                        <td>
                          <div className="sa-cell-title">
                            {d.employee.designation || "Equipment Operator"}
                          </div>
                        </td>
                        <td>{d.employee.phone || <span className="sa-text-muted">N/A</span>}</td>
                        <td>
                          <div className="sa-cell-title">{d.licenseNumber || "N/A"}</div>
                        </td>
                        <td>
                          {d.licenseExpiryDate ? d.licenseExpiryDate.slice(0, 10) : "N/A"}
                        </td>
                        <td>
                          <Badge variant={getStatusBadgeVariant(d.availabilityStatus)} size="sm">
                            {d.availabilityStatus.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td>
                          <div className="sa-table-actions" onClick={(e) => e.stopPropagation()}>
                            {canManage && (
                              <button
                                className="sa-icon-action"
                                title="Edit Driver Profile"
                                onClick={(e) => handleOpenEdit(d, e)}
                              >
                                ✏️
                              </button>
                            )}
                            {canManage && (
                              <button
                                className="sa-icon-action"
                                title="Delete Driver Profile"
                                disabled={deletingId === d.id}
                                onClick={(e) => handleDelete(d.id, e)}
                              >
                                🗑️
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

          {/* Mobile Card List View */}
          <div className="sa-mobile-only">
            <div className="sa-mobile-booking-list">
              {filteredDrivers.map((d) => (
                <div
                  key={d.id}
                  className="sa-mobile-booking-card"
                  onClick={() => handleOpenDetail(d)}
                >
                  <div className="sa-booking-card-top">
                    <div className="sa-booking-num">👨‍🌾 {d.employee.name}</div>
                    <Badge variant={getStatusBadgeVariant(d.availabilityStatus)} size="sm">
                      {d.availabilityStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="sa-booking-card-main">
                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label">👔 Title:</span>
                      <span className="sa-bcard-val">
                        {d.employee.designation || "Equipment Operator"}
                      </span>
                    </div>

                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label">🪪 License:</span>
                      <span className="sa-bcard-val">{d.licenseNumber || "N/A"}</span>
                    </div>

                    <div className="sa-bcard-row">
                      <span className="sa-bcard-label">📞 Phone:</span>
                      <span className="sa-bcard-val">{d.employee.phone || "N/A"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Form Modal (Create / Edit) */}
      <DriverFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={loadDrivers}
        driverToEdit={editingDriver}
      />

      {/* Detail Inspection Modal */}
      <DriverDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        driver={selectedDetailDriver}
        onEdit={(d) => handleOpenEdit(d)}
        onDelete={(id) => handleDelete(id)}
      />
    </div>
  );
};
