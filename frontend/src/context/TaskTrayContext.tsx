import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useIsMobile } from "../lib/useIsMobile";

// ---------------------------------------------------------------------------
// The shared "task tray" system behind every form/dialog in the app: full-
// screen sheets on mobile, draggable/resizable/overlapping windows on
// desktop, with minimize-and-resume on both. See the approved plan for the
// full reasoning; this file is the state layer only — rendering lives in
// components/TaskSheetHost.
//
// Mounted once, above <Routes> in App.tsx (inside AuthProvider, outside the
// per-route <AppLayout> wrappers) — every route remounts its own AppLayout
// on navigation, so this can't live inside one without losing state the
// moment the user navigates away from a minimized task.
// ---------------------------------------------------------------------------

export interface TaskGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

// A task's `geometry` always holds its normal-mode bounds, even while
// maximized or minimized — maximize is a pure render-time override (fill
// the workspace), not a mutation of stored bounds, so un-maximizing needs
// no separate "restore to" storage; the old geometry was never touched.
export interface Task<TInit = unknown, TDraft = unknown> {
  id: string;
  type: string;
  title: string;
  initProps: TInit;
  draft: TDraft;
  isMinimized: boolean;
  isMaximized: boolean;
  geometry: TaskGeometry;
  zIndex: number;
  createdAt: number;
  lastFocusedAt: number;
}

interface TaskTrayState {
  tasks: Task[];
  focusedTaskId: string | null;
  nextZIndex: number;
}

type Action =
  | { type: "OPEN_TASK"; task: Task; isMobile: boolean }
  | { type: "CLOSE_TASK"; id: string }
  | { type: "MINIMIZE_TASK"; id: string }
  | { type: "RESTORE_TASK"; id: string; isMobile: boolean }
  | { type: "TOGGLE_MAXIMIZE_TASK"; id: string }
  | { type: "FOCUS_TASK"; id: string }
  | { type: "UPDATE_DRAFT"; id: string; patch: Record<string, unknown> }
  | { type: "UPDATE_GEOMETRY"; id: string; geometry: TaskGeometry }
  | { type: "MINIMIZE_ALL_BUT_FOCUSED" }
  | { type: "HYDRATE"; state: TaskTrayState };

// Desktop only — how many non-minimized windows can be on screen at once
// before the least-recently-focused one gets auto-minimized to make room.
// Minimized tasks are just draft data sitting in the tray, not live
// draggable/resizable instances, so they don't count against this.
const MAX_VISIBLE_WINDOWS = 5;

function touch(task: Task): Task {
  return { ...task, lastFocusedAt: Date.now() };
}

// Shared by OPEN and RESTORE: on mobile, only one task is ever visible at a
// time, so opening/restoring one minimizes every other non-minimized task.
// On desktop, the same idea applies but bounded by MAX_VISIBLE_WINDOWS —
// minimize the least-recently-focused windows (oldest lastFocusedAt first)
// until the newly-visible task fits under the cap.
function enforceVisibilityLimit(tasks: Task[], keepVisibleId: string, isMobile: boolean): Task[] {
  if (isMobile) {
    return tasks.map((t) => (t.id === keepVisibleId ? t : t.isMinimized ? t : { ...t, isMinimized: true }));
  }

  const visible = tasks.filter((t) => !t.isMinimized || t.id === keepVisibleId);
  const overBy = visible.length - MAX_VISIBLE_WINDOWS;
  if (overBy <= 0) return tasks;

  const candidates = visible
    .filter((t) => t.id !== keepVisibleId)
    .sort((a, b) => a.lastFocusedAt - b.lastFocusedAt);
  const toMinimize = new Set(candidates.slice(0, overBy).map((t) => t.id));

  return tasks.map((t) => (toMinimize.has(t.id) ? { ...t, isMinimized: true } : t));
}

function reducer(state: TaskTrayState, action: Action): TaskTrayState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "OPEN_TASK": {
      const withNew = [...state.tasks, { ...action.task, zIndex: state.nextZIndex }];
      const tasks = enforceVisibilityLimit(withNew, action.task.id, action.isMobile);
      return { tasks, focusedTaskId: action.task.id, nextZIndex: state.nextZIndex + 1 };
    }

    case "CLOSE_TASK": {
      const tasks = state.tasks.filter((t) => t.id !== action.id);
      const focusedTaskId = state.focusedTaskId === action.id ? null : state.focusedTaskId;
      return { ...state, tasks, focusedTaskId };
    }

    case "MINIMIZE_TASK": {
      const tasks = state.tasks.map((t) => (t.id === action.id ? { ...t, isMinimized: true } : t));
      const focusedTaskId = state.focusedTaskId === action.id ? null : state.focusedTaskId;
      return { ...state, tasks, focusedTaskId };
    }

    case "RESTORE_TASK": {
      const restored = state.tasks.map((t) =>
        t.id === action.id ? touch({ ...t, isMinimized: false, zIndex: state.nextZIndex }) : t,
      );
      const tasks = enforceVisibilityLimit(restored, action.id, action.isMobile);
      return { tasks, focusedTaskId: action.id, nextZIndex: state.nextZIndex + 1 };
    }

    case "TOGGLE_MAXIMIZE_TASK": {
      const tasks = state.tasks.map((t) => (t.id === action.id ? { ...t, isMaximized: !t.isMaximized } : t));
      return { ...state, tasks };
    }

    case "FOCUS_TASK": {
      if (state.focusedTaskId === action.id) return state;
      const tasks = state.tasks.map((t) => (t.id === action.id ? touch({ ...t, zIndex: state.nextZIndex }) : t));
      return { tasks, focusedTaskId: action.id, nextZIndex: state.nextZIndex + 1 };
    }

    case "UPDATE_DRAFT": {
      const tasks = state.tasks.map((t) =>
        t.id === action.id ? { ...t, draft: { ...(t.draft as object), ...action.patch } } : t,
      );
      return { ...state, tasks };
    }

    case "UPDATE_GEOMETRY": {
      const tasks = state.tasks.map((t) => (t.id === action.id ? { ...t, geometry: action.geometry } : t));
      return { ...state, tasks };
    }

    case "MINIMIZE_ALL_BUT_FOCUSED": {
      const keepId = state.focusedTaskId;
      const tasks = state.tasks.map((t) => (t.id === keepId ? t : { ...t, isMinimized: true }));
      return { ...state, tasks };
    }

    default:
      return state;
  }
}

const EMPTY_STATE: TaskTrayState = { tasks: [], focusedTaskId: null, nextZIndex: 1 };

// Drafts older than this are dropped on load rather than resurrected —
// stale form data referencing a since-renamed/deleted customer, village,
// or machine is more confusing than helpful. Not configurable; a fixed,
// deliberately short window.
const STALE_TASK_MS = 48 * 60 * 60 * 1000;

function storageKey(userId: string): string {
  return `shabooagri_task_tray_${userId}`;
}

function loadFromStorage(userId: string): TaskTrayState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as TaskTrayState;
    const cutoff = Date.now() - STALE_TASK_MS;
    const tasks = (parsed.tasks || []).filter((t) => t.createdAt >= cutoff);
    const focusedTaskId = tasks.some((t) => t.id === parsed.focusedTaskId) ? parsed.focusedTaskId : null;
    const nextZIndex = tasks.reduce((max, t) => Math.max(max, t.zIndex), 0) + 1;
    return { tasks, focusedTaskId, nextZIndex };
  } catch {
    return EMPTY_STATE;
  }
}

// Cascade offset for a newly-opened window, resetting after a handful of
// windows so they don't walk off-screen. Default size is viewport-relative
// (computed by the caller, see openTask below) rather than a fixed pixel
// size, so it looks reasonable on both a small laptop and a large monitor.
const CASCADE_STEP = 32;
const CASCADE_MAX_STEPS = 6;

function nextCascadePosition(existingCount: number): { x: number; y: number } {
  const step = existingCount % CASCADE_MAX_STEPS;
  return { x: 80 + step * CASCADE_STEP, y: 64 + step * CASCADE_STEP };
}

function defaultGeometry(existingCount: number): TaskGeometry {
  const { x, y } = nextCascadePosition(existingCount);
  const width = Math.min(760, Math.max(480, Math.round(window.innerWidth * 0.6)));
  const height = Math.min(720, Math.max(420, Math.round(window.innerHeight * 0.8)));
  return { x, y, width, height };
}

interface OpenTaskInput<TInit, TDraft> {
  type: string;
  title: string;
  initProps: TInit;
  defaultDraft: TDraft;
}

interface TaskTrayContextValue {
  tasks: Task[];
  focusedTaskId: string | null;
  isMobile: boolean;
  open: <TInit, TDraft>(input: OpenTaskInput<TInit, TDraft>) => string;
  close: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
  focus: (id: string) => void;
  updateDraft: (id: string, patch: Record<string, unknown>) => void;
  updateGeometry: (id: string, geometry: TaskGeometry) => void;
}

const TaskTrayContext = createContext<TaskTrayContextValue | undefined>(undefined);

let taskIdCounter = 0;
function generateTaskId(): string {
  taskIdCounter += 1;
  return `task-${Date.now()}-${taskIdCounter}`;
}

export const TaskTrayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const userIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate (or reset) when the logged-in user changes — a different
  // person logging in on the same browser must not see the previous
  // user's in-progress drafts.
  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId === userIdRef.current) return;
    userIdRef.current = userId;
    hydratedRef.current = false;
    if (userId) {
      dispatch({ type: "HYDRATE", state: loadFromStorage(userId) });
    } else {
      dispatch({ type: "HYDRATE", state: EMPTY_STATE });
    }
    hydratedRef.current = true;
  }, [user?.id]);

  // Persist on every change, once hydration has actually run (otherwise
  // the initial EMPTY_STATE render would immediately overwrite storage
  // before the real hydrated state loads).
  useEffect(() => {
    if (!hydratedRef.current || !userIdRef.current) return;
    try {
      localStorage.setItem(storageKey(userIdRef.current), JSON.stringify(state));
    } catch {
      // Storage full/unavailable (private browsing, quota) — in-memory
      // state still works for the rest of this session, just won't
      // survive a refresh. Not worth surfacing to the user.
    }
  }, [state]);

  // Crossing into mobile with more than one window open: mobile can only
  // ever show one task at a time, so collapse everything else into the
  // tray. Crossing back out to desktop needs no equivalent action —
  // nothing auto-restores, the user reopens what they want from the tray.
  const wasMobileRef = useRef(isMobile);
  useEffect(() => {
    if (isMobile && !wasMobileRef.current) {
      dispatch({ type: "MINIMIZE_ALL_BUT_FOCUSED" });
    }
    wasMobileRef.current = isMobile;
  }, [isMobile]);

  const open = useCallback(
    <TInit, TDraft>(input: OpenTaskInput<TInit, TDraft>): string => {
      const id = generateTaskId();
      const task: Task<TInit, TDraft> = {
        id,
        type: input.type,
        title: input.title,
        initProps: input.initProps,
        draft: input.defaultDraft,
        isMinimized: false,
        isMaximized: false,
        geometry: defaultGeometry(state.tasks.filter((t) => !t.isMinimized).length),
        zIndex: 0,
        createdAt: Date.now(),
        lastFocusedAt: Date.now(),
      };
      dispatch({ type: "OPEN_TASK", task: task as Task, isMobile });
      return id;
    },
    [isMobile, state.tasks],
  );

  const close = useCallback((id: string) => dispatch({ type: "CLOSE_TASK", id }), []);
  const minimize = useCallback((id: string) => dispatch({ type: "MINIMIZE_TASK", id }), []);
  const restore = useCallback((id: string) => dispatch({ type: "RESTORE_TASK", id, isMobile }), [isMobile]);
  const toggleMaximize = useCallback((id: string) => dispatch({ type: "TOGGLE_MAXIMIZE_TASK", id }), []);
  const focus = useCallback((id: string) => dispatch({ type: "FOCUS_TASK", id }), []);
  const updateDraft = useCallback(
    (id: string, patch: Record<string, unknown>) => dispatch({ type: "UPDATE_DRAFT", id, patch }),
    [],
  );
  const updateGeometry = useCallback(
    (id: string, geometry: TaskGeometry) => dispatch({ type: "UPDATE_GEOMETRY", id, geometry }),
    [],
  );

  const value = useMemo<TaskTrayContextValue>(
    () => ({
      tasks: state.tasks,
      focusedTaskId: state.focusedTaskId,
      isMobile,
      open,
      close,
      minimize,
      restore,
      toggleMaximize,
      focus,
      updateDraft,
      updateGeometry,
    }),
    [state.tasks, state.focusedTaskId, isMobile, open, close, minimize, restore, toggleMaximize, focus, updateDraft, updateGeometry],
  );

  return <TaskTrayContext.Provider value={value}>{children}</TaskTrayContext.Provider>;
};

// The contract every task-content component (a form migrated onto this
// system) implements. Deliberately does NOT include draft/setDraft — a
// component sources those itself via useTaskDraft(taskId, defaultDraft),
// since only the form itself knows its own draft shape and default;
// TaskSheetHost just needs to mount the right component for a task's
// `type` and give it a way to close itself.
export interface TaskContentProps<TInit = unknown> {
  taskId: string;
  initProps: TInit;
  onRequestClose: () => void;
}
export type TaskContentComponent<TInit = unknown> = React.FC<TaskContentProps<TInit>>;

export function useTaskTray(): TaskTrayContextValue {
  const ctx = useContext(TaskTrayContext);
  if (!ctx) throw new Error("useTaskTray must be used within a TaskTrayProvider");
  return ctx;
}

// Per-task-content convenience hook: reads/writes one task's draft object
// as if it were useState, without each form needing to know about
// updateDraft/dispatch directly. Individual field setters (setDraft({
// customerId: x })) merge into the existing draft rather than replacing it.
//
// Reads the live value from the tray's own task list (not just an echo of
// whatever the caller passed in) — the second argument is only a fallback
// for the one render before the task exists in the tray, if ever. Getting
// this wrong (returning the passed-in default unconditionally) would make
// every field in every migrated form appear frozen: typing would dispatch
// updateDraft correctly, but the component would keep reading back its own
// stale initial value instead of the reducer's updated one.
export function useTaskDraft<TDraft extends object>(
  taskId: string,
  defaultDraft: TDraft,
): [TDraft, (patch: Partial<TDraft> | ((prev: TDraft) => Partial<TDraft>)) => void] {
  const { tasks, updateDraft } = useTaskTray();
  const task = tasks.find((t) => t.id === taskId);
  const draft = (task?.draft as TDraft | undefined) ?? defaultDraft;

  const setDraft = useCallback(
    (patch: Partial<TDraft> | ((prev: TDraft) => Partial<TDraft>)) => {
      const resolved = typeof patch === "function" ? (patch as (prev: TDraft) => Partial<TDraft>)(draft) : patch;
      updateDraft(taskId, resolved);
    },
    [taskId, draft, updateDraft],
  );
  return [draft, setDraft];
}
