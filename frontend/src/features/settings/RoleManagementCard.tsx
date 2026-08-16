import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Permission, Role } from "../../types/rbac";
import type { Employee } from "../../types/employee";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import {
  Lock,
  Plus,
  Key,
  Users,
  Pencil,
  Trash2,
  UserPlus,
  Folder,
  AlertCircle
} from "lucide-react";

interface RoleManagementCardProps {
  canManage: boolean;
}

export const RoleManagementCard: React.FC<RoleManagementCardProps> = ({ canManage }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [selectedPermKeys, setSelectedPermKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);

  // User role assignment state
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rList, pList, eList] = await Promise.all([
        api.listRoles(),
        api.listPermissions(),
        api.listEmployees().catch(() => []),
      ]);
      setRoles(rList);
      setPermissions(pList);
      setEmployees(eList);
    } catch (err: any) {
      setError(err.message || "Failed to load roles and permissions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName("");
    setSelectedPermKeys([]);
    setModalErr(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermKeys(role.rolePermissions.map((rp) => rp.permission.key));
    setModalErr(null);
    setIsModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setModalErr("Role name is required");
      return;
    }
    setIsSaving(true);
    setModalErr(null);
    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, {
          name: editingRole.isSystemRole ? undefined : roleName.trim(),
          permissionKeys: selectedPermKeys,
        });
      } else {
        await api.createRole({
          name: roleName.trim(),
          permissionKeys: selectedPermKeys,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setModalErr(err.message || "Failed to save role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm("Are you sure you want to delete this custom role?")) return;
    try {
      await api.deleteRole(roleId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete role");
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRoleId) return;
    setIsAssigning(true);
    setAssignMsg(null);
    try {
      await api.assignUserRole(selectedUserId, selectedRoleId);
      setAssignMsg("User role updated successfully.");
      setTimeout(() => setAssignMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      setAssignMsg(`${err.message || "Failed to assign role"}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const togglePermission = (key: string) => {
    if (selectedPermKeys.includes(key)) {
      setSelectedPermKeys(selectedPermKeys.filter((k) => k !== key));
    } else {
      setSelectedPermKeys([...selectedPermKeys, key]);
    }
  };

  // Group permissions by prefix e.g. booking, job, machine
  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const group = perm.key.split(".")[0] || "general";
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  if (isLoading) return (
    <div className="sa-center-viewport">
      <Spinner size="lg" label="Loading RBAC configuration..." />
    </div>
  );
  if (error) return (
    <div className="sa-error-container">
      <div className="sa-error-card">
        <span className="sa-error-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <AlertTriangle size={32} color="var(--color-error, #D32F2F)" />
        </span>
        <h3>Error Loading Roles & Permissions</h3>
        <p>{error}</p>
        <Button variant="primary" onClick={loadData}>Retry</Button>
      </div>
    </div>
  );

  return (
    <Card
      title="Role-Based Access Control (RBAC)"
      subtitle="Manage system and custom roles with granular permission assignments (§6)"
    >
      {!canManage && (
        <div className="sa-info-banner" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Lock size={14} /> Read-only — only administrators can configure roles and permissions.
        </div>
      )}

      {/* Action Header */}
      {canManage && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <Button variant="primary" size="sm" onClick={openCreateModal} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} /> Create Custom Role
          </Button>
        </div>
      )}

      {/* Role List Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {roles.map((role) => {
          const permCount = role.rolePermissions.length;
          const userCount = role._count?.users ?? 0;
          return (
            <div
              key={role.id}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "14px",
                background: "var(--color-surface)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{role.name}</div>
                <Badge variant={role.isSystemRole ? "info" : "success"}>
                  {role.isSystemRole ? "System Role" : "Custom Role"}
                </Badge>
              </div>

              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Key size={14} /> {permCount} perms</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Users size={14} /> {userCount} users</span>
              </div>

              {/* Permission pill summary */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px", maxHeight: "80px", overflowY: "auto" }}>
                {role.rolePermissions.map((rp) => (
                  <span
                    key={rp.permission.id}
                    style={{
                      fontSize: "0.72rem",
                      background: "var(--color-surface-secondary)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "4px",
                      padding: "2px 6px",
                    }}
                  >
                    {rp.permission.key}
                  </span>
                ))}
              </div>

              {canManage && (
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <Button variant="secondary" size="sm" onClick={() => openEditModal(role)} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Pencil size={14} /> Edit Permissions
                  </Button>
                  {!role.isSystemRole && (
                    <Button variant="danger" size="sm" onClick={() => handleDeleteRole(role.id)} title="Delete role">
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Role Assignment Section */}
      {canManage && (
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "16px" }}>
          <h4 style={{ margin: "16px 0 8px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <UserPlus size={16} /> Assign Role to User
          </h4>
          {assignMsg && (
            <div style={{ fontSize: "0.85rem", marginBottom: "8px", color: !assignMsg.startsWith("Failed") ? "var(--color-success)" : "var(--color-danger)" }}>
              {assignMsg}
            </div>
          )}
          <form onSubmit={handleAssignRole} className="sa-form-row" style={{ alignItems: "flex-end", gap: "12px" }}>
            <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="sa-form-label">User / Employee</label>
              <select
                className="sa-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">Select User…</option>
                {employees.filter((emp) => emp.userId).map((emp) => (
                  <option key={emp.id} value={emp.userId!}>
                    {emp.name} ({emp.roleTitle || "Staff"})
                  </option>
                ))}
              </select>
            </div>
            <div className="sa-form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="sa-form-label">Target Role</label>
              <select
                className="sa-select"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                required
              >
                <option value="">Select Role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isSystemRole ? "(System)" : "(Custom)"}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="primary" type="submit" disabled={isAssigning}>
              {isAssigning ? "Assigning…" : "Assign Role"}
            </Button>
          </form>
        </div>
      )}

      {/* Modal for Create / Edit Role */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : "Create Custom Role"}
        maxWidth="680px"
      >
        <form onSubmit={handleSaveRole}>
          {modalErr && <div className="sa-form-error" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}><AlertCircle size={16} /> {modalErr}</div>}

          <Input
            label="Role Name"
            type="text"
            placeholder="e.g. Dispatcher, Supervisor, Accountant"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            disabled={editingRole?.isSystemRole}
            required
          />

          <div style={{ margin: "16px 0 8px", fontWeight: 600, fontSize: "0.9rem" }}>
            Assign Permissions by Module:
          </div>

          <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", paddingRight: "4px" }}>
            {Object.entries(groupedPermissions).map(([group, perms]) => (
              <div key={group} style={{ background: "var(--color-surface-secondary)", padding: "10px 12px", borderRadius: "6px" }}>
                <div style={{ textTransform: "capitalize", fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Folder size={14} /> {group} Module
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "6px" }}>
                  {perms.map((p) => {
                    const isChecked = selectedPermKeys.includes(p.key);
                    return (
                      <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(p.key)}
                        />
                        <span>
                          <strong>{p.key}</strong> — {p.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="sa-form-actions" style={{ marginTop: "20px" }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};

