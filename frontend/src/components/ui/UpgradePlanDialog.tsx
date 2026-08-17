import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { getTerm } from "../../lib/terminology";

interface UpgradePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  upgradeUrl: string;
}

// Shown when the operational backend blocks an action with
// { code: "MACHINE_LIMIT_REACHED", upgradeUrl }. A plain browser link to
// the platform site's Upgrade page — no backend-to-backend call, no new
// runtime dependency on the platform being up.
export const UpgradePlanDialog: React.FC<UpgradePlanDialogProps> = ({ isOpen, onClose, message, upgradeUrl }) => {
  const machineTerm = getTerm("machine");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${machineTerm} Limit Reached`} maxWidth="420px">
      <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: "20px" }}>{message}</p>
      <div style={{ display: "flex", gap: "8px" }}>
        <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          style={{ flex: 1 }}
          onClick={() => window.open(upgradeUrl, "_blank", "noopener,noreferrer")}
        >
          Upgrade Plan
        </Button>
      </div>
    </Modal>
  );
};
