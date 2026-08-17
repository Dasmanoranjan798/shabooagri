import React, { useState } from "react";
import { Rnd } from "react-rnd";
import { Minus, Square, Copy, X, ChevronUp, ChevronDown } from "lucide-react";
import "./taskSheetHost.css";
import { useTaskTray, type Task, type TaskContentComponent } from "../../context/TaskTrayContext";
import { BookingFormTask } from "../../features/bookings/BookingFormModal";
import { VillageFormTask } from "../../features/villages/VillageFormModal";
import { VoidReasonTask } from "../ui/VoidReasonModal";
import { JobCancelReasonTask } from "../../features/jobs/JobCancelReasonModal";
import { MachineFormTask } from "../../features/machines/MachineFormModal";
import { DriverFormTask } from "../../features/drivers/DriverFormModal";
import { CustomerFormTask } from "../../features/customers/CustomerFormModal";
import { EmployeeFormTask } from "../../features/employees/EmployeeFormModal";
import { ExpenseFormTask } from "../../features/expenses/ExpenseFormModal";
import { NewInvoiceTask } from "../../features/payments/NewInvoiceModal";
import { ReceivePaymentTask } from "../../features/payments/ReceivePaymentModal";
import { RecordAdvanceTask } from "../../features/payments/RecordAdvanceModal";
import { InviteStaffTask } from "../../features/team/InviteStaffModal";
import { ManualJobEntryTask } from "../../features/jobs/ManualJobEntryModal";
import { JobExecutionTask } from "../../features/jobs/JobExecutionModal";
import { MaintenanceLogTask } from "../../features/maintenance/MaintenanceLogModal";

// Task `type` -> the content component that renders it. Every form
// migrated onto this system registers itself here. Growing across Pass 2
// batches — see docs/memory on the task-tray system for the full
// remaining list and current status.
const TASK_REGISTRY: Record<string, TaskContentComponent<any>> = {
  "booking-form": BookingFormTask,
  "village-form": VillageFormTask,
  "void-reason": VoidReasonTask,
  "job-cancel-reason": JobCancelReasonTask,
  "machine-form": MachineFormTask,
  "driver-form": DriverFormTask,
  "customer-form": CustomerFormTask,
  "employee-form": EmployeeFormTask,
  "expense-form": ExpenseFormTask,
  "new-invoice": NewInvoiceTask,
  "receive-payment": ReceivePaymentTask,
  "record-advance": RecordAdvanceTask,
  "invite-staff": InviteStaffTask,
  "manual-job-entry": ManualJobEntryTask,
  "job-execution": JobExecutionTask,
  "maintenance-log": MaintenanceLogTask,
};

const TaskChrome: React.FC<{
  title: string;
  isMobile: boolean;
  isMaximized?: boolean;
  onMinimize: () => void;
  onToggleMaximize?: () => void;
  onClose: () => void;
}> = ({ title, isMobile, isMaximized, onMinimize, onToggleMaximize, onClose }) => (
  <div className="sa-task-titlebar">
    <span className="sa-task-titlebar-title">{title}</span>
    <div className="sa-task-titlebar-controls">
      <button type="button" className="sa-task-titlebar-btn" title="Minimize" onClick={onMinimize}>
        <Minus size={16} />
      </button>
      {!isMobile && onToggleMaximize && (
        <button
          type="button"
          className="sa-task-titlebar-btn"
          title={isMaximized ? "Restore" : "Maximize"}
          onClick={onToggleMaximize}
        >
          {isMaximized ? <Copy size={14} /> : <Square size={13} />}
        </button>
      )}
      <button type="button" className="sa-task-titlebar-btn sa-task-titlebar-btn--close" title="Close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  </div>
);

const TaskContentRenderer: React.FC<{ task: Task; onRequestClose: () => void }> = ({ task, onRequestClose }) => {
  const Component = TASK_REGISTRY[task.type];
  if (!Component) {
    console.error(`No task content registered for type "${task.type}"`);
    return null;
  }
  return <Component taskId={task.id} initProps={task.initProps} onRequestClose={onRequestClose} />;
};

const MobileTray: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const { restore, close } = useTaskTray();
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="sa-task-mobile-tray">
      {isExpanded && (
        <div className="sa-task-mobile-tray-list">
          {tasks.map((t) => (
            <div key={t.id} className="sa-task-mobile-tray-row">
              <span className="sa-task-mobile-tray-row-title" onClick={() => restore(t.id)}>
                {t.title}
              </span>
              <div className="sa-task-mobile-tray-row-actions">
                <button type="button" className="sa-task-titlebar-btn" title="Discard" onClick={() => close(t.id)}>
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="sa-task-mobile-tray-bar" onClick={() => setIsExpanded((v) => !v)}>
        <span>
          {tasks.length} task{tasks.length === 1 ? "" : "s"} in progress
        </span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </div>
    </div>
  );
};

const DesktopTray: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const { restore, close } = useTaskTray();
  if (tasks.length === 0) return null;

  return (
    <div className="sa-task-desktop-tray">
      {tasks.map((t) => (
        <div key={t.id} className="sa-task-chip" onClick={() => restore(t.id)} title={t.title}>
          <span className="sa-task-chip-title">{t.title}</span>
          <span
            className="sa-task-chip-close"
            onClick={(e) => {
              e.stopPropagation();
              close(t.id);
            }}
          >
            <X size={13} />
          </span>
        </div>
      ))}
    </div>
  );
};

export const TaskSheetHost: React.FC = () => {
  const { tasks, focusedTaskId, isMobile, close, minimize, toggleMaximize, focus, updateGeometry } = useTaskTray();

  const visibleTasks = tasks.filter((t) => !t.isMinimized);
  const minimizedTasks = tasks.filter((t) => t.isMinimized);

  if (isMobile) {
    const focused = visibleTasks.find((t) => t.id === focusedTaskId) ?? visibleTasks[0] ?? null;
    return (
      <>
        {focused && (
          <div className="sa-task-mobile-sheet">
            <TaskChrome
              title={focused.title}
              isMobile
              onMinimize={() => minimize(focused.id)}
              onClose={() => close(focused.id)}
            />
            <div className="sa-task-window-body">
              <TaskContentRenderer task={focused} onRequestClose={() => close(focused.id)} />
            </div>
          </div>
        )}
        <MobileTray tasks={minimizedTasks} />
      </>
    );
  }

  return (
    <>
      <div className="sa-task-desktop-workspace">
        {visibleTasks.map((task) =>
          // Always the same <Rnd> element (never a div<->Rnd type switch)
          // so toggling maximize never unmounts/remounts the form inside —
          // that would silently reset its loaded dropdown data and clear
          // any visible error message on every maximize click, which is
          // exactly the kind of thing minimize-and-resume is supposed to
          // prevent. Maximized just forces position/size to fill the
          // workspace and disables drag/resize; task.geometry itself is
          // never overwritten while maximized, so un-maximizing snaps
          // straight back to where the window was.
          <Rnd
            key={task.id}
            position={task.isMaximized ? { x: 0, y: 0 } : { x: task.geometry.x, y: task.geometry.y }}
            size={task.isMaximized ? { width: "100%", height: "100%" } : { width: task.geometry.width, height: task.geometry.height }}
            minWidth={360}
            minHeight={300}
            bounds="parent"
            dragHandleClassName="sa-task-titlebar"
            cancel=".sa-task-titlebar-btn"
            disableDragging={task.isMaximized}
            enableResizing={!task.isMaximized}
            className={`sa-task-window${task.isMaximized ? " sa-task-window--maximized" : ""}${task.id === focusedTaskId ? " sa-task-window--focused" : ""}`}
            style={{ zIndex: task.zIndex }}
            onDragStop={(_e, d) => {
              if (!task.isMaximized) updateGeometry(task.id, { ...task.geometry, x: d.x, y: d.y });
            }}
            onResizeStop={(_e, _dir, ref, _delta, pos) => {
              if (!task.isMaximized) {
                updateGeometry(task.id, { x: pos.x, y: pos.y, width: ref.offsetWidth, height: ref.offsetHeight });
              }
            }}
            onMouseDown={() => focus(task.id)}
          >
            <TaskChrome
              title={task.title}
              isMobile={false}
              isMaximized={task.isMaximized}
              onMinimize={() => minimize(task.id)}
              onToggleMaximize={() => toggleMaximize(task.id)}
              onClose={() => close(task.id)}
            />
            <div className="sa-task-window-body">
              <TaskContentRenderer task={task} onRequestClose={() => close(task.id)} />
            </div>
          </Rnd>,
        )}
      </div>
      <DesktopTray tasks={minimizedTasks} />
    </>
  );
};
