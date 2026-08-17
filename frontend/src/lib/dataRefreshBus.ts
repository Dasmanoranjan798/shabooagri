// Tiny pub/sub, deliberately not part of TaskTrayContext's state. A saved
// task (e.g. a Booking form) may finish long after the page that opened it
// has unmounted (the user navigated away while it sat minimized) — a
// directly-stored "onSuccess" callback prop would be a stale closure by
// then. Pages subscribe to a topic instead of receiving a callback, so
// "refresh your list" reaches whichever instance of the page happens to be
// mounted right now, or does nothing if none is.
type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function notifyDataRefresh(topic: string): void {
  listeners.get(topic)?.forEach((fn) => fn());
}

export function subscribeDataRefresh(topic: string, fn: Listener): () => void {
  if (!listeners.has(topic)) {
    listeners.set(topic, new Set());
  }
  listeners.get(topic)!.add(fn);
  return () => {
    listeners.get(topic)?.delete(fn);
  };
}
