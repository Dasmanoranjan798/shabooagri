import React, { useEffect, useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { Badge, type BadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { InviteStaffModal } from "./InviteStaffModal";
import type { TeamUser, StaffInvite } from "../../types/team";

function inviteStatusVariant(status: StaffInvite["status"]): BadgeVariant {
  if (status === "PENDING") return "warning";
  if (status === "ACCEPTED") return "success";
  if (status === "REVOKED") return "danger";
  return "neutral";
}

export const TeamPage: React.FC = () => {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [userList, inviteList] = await Promise.all([api.listTeamUsers(), api.listInvites()]);
      setUsers(userList);
      setInvites(inviteList);
    } catch (err: any) {
      setError(err.message || "Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUserStatus = async (user: TeamUser) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmMsg =
      nextStatus === "INACTIVE"
        ? `Deactivate ${user.fullName}? They will no longer be able to log in.`
        : `Reactivate ${user.fullName}?`;
    if (!window.confirm(confirmMsg)) return;

    setBusyId(user.id);
    try {
      await api.setTeamUserStatus(user.id, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update user status");
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeInvite = async (invite: StaffInvite) => {
    if (!window.confirm(`Revoke the invite for ${invite.fullName}?`)) return;
    setBusyId(invite.id);
    try {
      await api.revokeInvite(invite.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to revoke invite");
    } finally {
      setBusyId(null);
    }
  };

  const pendingInvites = invites.filter((i) => i.status === "PENDING");
  const historyInvites = invites.filter((i) => i.status !== "PENDING");

  return (
    <div className="sa-employees-page">
      <div className="sa-page-header">
        <div className="sa-page-header-text">
          <h2>Team</h2>
          <p>Invite staff members and manage who has access to your company's software</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsInviteModalOpen(true)}>
          + Invite Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="sa-center-viewport">
          <Spinner size="lg" label="Loading team..." />
        </div>
      ) : error ? (
        <div className="sa-error-container">
          <div className="sa-error-card">
            <h3>Error Loading Team</h3>
            <p>{error}</p>
            <Button variant="primary" onClick={loadData}>
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Card title="Current Staff" subtitle={`${users.length} account${users.length === 1 ? "" : "s"}`}>
            <div className="sa-table-responsive">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="sa-td-bold">{user.fullName}</td>
                      <td>{user.role.name}</td>
                      <td>{user.email || user.mobileNumber || <span className="sa-text-muted">N/A</span>}</td>
                      <td>
                        <Badge variant={user.status === "ACTIVE" ? "success" : "danger"} size="sm">
                          {user.status}
                        </Badge>
                      </td>
                      <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}</td>
                      <td>
                        <button
                          className="sa-icon-action"
                          title={user.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                          disabled={busyId === user.id}
                          onClick={() => handleToggleUserStatus(user)}
                        >
                          {user.status === "ACTIVE" ? <Ban size={15} /> : <RotateCcw size={15} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div style={{ marginTop: "24px" }}>
          <Card
            title="Pending Invites"
            subtitle={`${pendingInvites.length} awaiting acceptance`}
          >
            {pendingInvites.length === 0 ? (
              <div className="sa-empty-state">
                <p>No pending invites.</p>
              </div>
            ) : (
              <div className="sa-table-responsive">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Contact</th>
                      <th>Sent By</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvites.map((invite) => (
                      <tr key={invite.id}>
                        <td className="sa-td-bold">{invite.fullName}</td>
                        <td>{invite.role.name}</td>
                        <td>{invite.email || invite.phone}</td>
                        <td>{invite.invitedBy.fullName}</td>
                        <td>{new Date(invite.expiresAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="sa-icon-action"
                            title="Revoke Invite"
                            disabled={busyId === invite.id}
                            onClick={() => handleRevokeInvite(invite)}
                          >
                            <Ban size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          </div>

          {historyInvites.length > 0 && (
            <div style={{ marginTop: "24px" }}>
            <Card title="Invite History">
              <div className="sa-table-responsive">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Contact</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyInvites.map((invite) => (
                      <tr key={invite.id}>
                        <td>{invite.fullName}</td>
                        <td>{invite.role.name}</td>
                        <td>{invite.email || invite.phone}</td>
                        <td>
                          <Badge variant={inviteStatusVariant(invite.status)} size="sm">
                            {invite.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            </div>
          )}
        </>
      )}

      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
