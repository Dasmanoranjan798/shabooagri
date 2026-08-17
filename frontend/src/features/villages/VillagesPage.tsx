import React, { useEffect, useState } from "react";
import { Pencil, Trash2, AlertTriangle, MapPin } from "lucide-react";
import "../customers/customers.css";
import type { VillageOption } from "../../types/booking";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { defaultVillageDraft } from "./VillageFormModal";
import { useTaskTray } from "../../context/TaskTrayContext";
import { subscribeDataRefresh } from "../../lib/dataRefreshBus";

// New page (§ dependency-locked deletion) — villages were previously only
// manageable inline from Booking/Customer forms (create + rename, no
// list/delete/deactivate view of their own). This supersedes the earlier
// "villages are rename-only" placeholder: villages now follow the same
// dependency-guarded delete rule as every other master-data module, with a
// real management surface to match.
export const VillagesPage: React.FC = () => {
  const { roleKey, hasPermission } = useAuth();
  const villageTerm = getTerm("village", true);

  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const taskTray = useTaskTray();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManage = roleKey === "owner" || hasPermission("village.manage");
  // Owner-only (§ dependency-locked deletion, Rule 4 & 5).
  const canDelete = roleKey === "owner" || hasPermission("village.delete");

  const loadVillages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.listVillages();
      setVillages(list);
    } catch (err: any) {
      setError(err.message || `Failed to load ${villageTerm.toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVillages();
    return subscribeDataRefresh("villages", loadVillages);
  }, []);

  const handleOpenCreate = () => {
    taskTray.open({
      type: "village-form",
      title: `Add ${getTerm("village")}`,
      initProps: { villageToEdit: null },
      defaultDraft: defaultVillageDraft(null),
    });
  };

  const handleOpenEdit = (village: VillageOption) => {
    taskTray.open({
      type: "village-form",
      title: `Rename ${getTerm("village")}`,
      initProps: { villageToEdit: village },
      defaultDraft: defaultVillageDraft(village),
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${getTerm("village")}?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteVillage(id);
      loadVillages();
    } catch (err: any) {
      alert(err.message || `Failed to delete ${getTerm("village")}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (village: VillageOption) => {
    try {
      await api.updateVillage(village.id, { isActive: !village.isActive });
      loadVillages();
    } catch (err: any) {
      alert(err.message || `Failed to update ${getTerm("village")}`);
    }
  };

  const filteredVillages = villages.filter((v) => {
    if (!searchQuery.trim()) return true;
    return v.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="sa-customers-page">
      <div className="sa-page-header">
        <div className="sa-page-header-text">
          <h2>{villageTerm} Directory</h2>
          <p>Manage the villages used for customer locations and bookings</p>
        </div>

        {canManage && (
          <Button variant="primary" size="md" onClick={handleOpenCreate}>
            + Add {getTerm("village")}
          </Button>
        )}
      </div>

      <div className="sa-toolbar">
        <div className="sa-toolbar-search" style={{ minWidth: "300px" }}>
          <input
            type="text"
            className="sa-input sa-search-input"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="sa-center-viewport">
          <Spinner size="lg" label={`Loading ${villageTerm.toLowerCase()}...`} />
        </div>
      ) : error ? (
        <div className="sa-error-container">
          <div className="sa-error-card">
            <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={32} color="var(--color-error, #D32F2F)" />
            </span>
            <h3>Error Loading {villageTerm}</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={loadVillages}>
              Retry
            </Button>
          </div>
        </div>
      ) : filteredVillages.length === 0 ? (
        <Card>
          <div className="sa-empty-state">
            <span className="sa-empty-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={32} color="var(--color-text-muted)" />
            </span>
            <h3>No {villageTerm} Found</h3>
            <p>
              {searchQuery
                ? "No villages match your search."
                : `No ${villageTerm.toLowerCase()} added yet.`}
            </p>
            {canManage && (
              <Button variant="primary" size="md" onClick={handleOpenCreate} style={{ marginTop: "1rem" }}>
                + Add First {getTerm("village")}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="sa-table-responsive">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVillages.map((v) => (
                  <tr key={v.id}>
                    <td className="sa-td-bold">{v.name}</td>
                    <td>
                      <Badge variant={v.isActive ? "success" : "neutral"} size="sm">
                        {v.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>
                      <div className="sa-table-actions">
                        <ActionMenu
                          items={[
                            { key: "edit", label: "Rename", icon: <Pencil size={15} />, onClick: () => handleOpenEdit(v), hidden: !canManage },
                            {
                              key: "toggle-active",
                              label: v.isActive ? "Mark Inactive" : "Mark Active",
                              icon: <MapPin size={15} />,
                              onClick: () => handleToggleActive(v),
                              hidden: !canManage,
                            },
                            {
                              key: "delete",
                              label: "Delete",
                              icon: <Trash2 size={15} />,
                              danger: true,
                              disabled: deletingId === v.id,
                              onClick: () => handleDelete(v.id),
                              hidden: !canDelete,
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
};
