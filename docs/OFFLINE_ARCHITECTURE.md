# ShabooAgri — Offline-First & Sync Architecture

This document describes how the ShabooAgri **Flutter** app works offline and how
it synchronizes with the operational backend. It reflects the *current* state of
the code and clearly separates **what is implemented** from **what is planned**
(so nobody has to read the source to know which is which).

> Architectural rule (unchanged): the **operational backend is the business
> authority** — all business rules, validation, financial/accounting math,
> booking rules, job-state transitions and permissions live there. Flutter uses
> local SQLite for offline operation and never re-implements authoritative
> business logic. One backend, one API contract, one Flutter codebase for
> Android / iOS / Windows / macOS.

---

## 1. Components

| Layer | File(s) | Role |
|---|---|---|
| Local database | `core/database/{tables,database}.dart` (Drift/SQLite) | On-device persistence: entity mirror tables, the durable outbox, and the HTTP read cache. |
| Connectivity | `core/sync/connectivity.dart` | Online/offline state, **seeded from the first frame** (the stock stream only emits on change). |
| Offline interceptor | `core/sync/offline_interceptor.dart` | The offline-first HTTP boundary on the shared Dio client. |
| Durable outbox | `core/sync/outbox.dart` (`OutboxOps` table) | Queues offline writes and replays them idempotently on reconnect. |
| Real-time bus | `core/sync/data_sync.dart` | After any write, invalidates every screen that shows the affected entities so they refetch — no manual refresh. |
| Error UX | `core/network/api_error.dart` | Translates every failure into professional copy; no raw exceptions reach the user. |
| Sync status UI | `core/sync/sync_status_banner.dart` | App-wide offline / syncing / needs-attention banner + sheet. |
| Backend idempotency | `backend/src/middleware/idempotency.middleware.ts` | Dedupes replayed mutations so a lost ack never double-writes. |

There is **one** sync engine (outbox + interceptor + real-time bus). The former
legacy `SyncService`/`SyncQueue` has been removed.

---

## 2. Reads — local-first, offline-capable (IMPLEMENTED)

Every read goes through the shared Dio client, which carries the
`OfflineInterceptor`:

```
Screen/provider → Dio GET → OfflineInterceptor
   online : returns live response, and caches the body in HttpCache (by full path+query)
   offline: serves the last cached body as a synthetic 200  → screen shows last-synced data
   offline + never cached (first run): returns a tagged OfflineNoData
             → the shared error UX shows "not downloaded yet", never a raw error
```

The core modules (bookings today; more in Phase 2) additionally use a repository
that reads the **SQLite mirror tables** directly (`getBookings()` etc.) and
refreshes them from the API when online — the strongest form of local-first
read.

**Result:** no ordinary screen shows a raw `DioException` / `Failed host lookup`,
and previously-synced data remains browsable offline.

---

## 3. Writes — instant local response, durable queue (IMPLEMENTED)

```
User action (create / edit / delete / status change / payment)
  → Dio POST/PUT/PATCH/DELETE
  → OfflineInterceptor
       online : sent normally (stamped with a stable Idempotency-Key)
       offline: • enqueued into the durable OutboxOps table (survives restart)
                • optimistic success returned immediately (UI records it now)
                • local HTTP cache patched (append/merge/remove) so lists update
                • real-time bus bumped so every dependent screen refreshes
```

### Identity & idempotency (financial safety)
- Every mutation is stamped with a **stable idempotency key** *before* the first
  online attempt. If that attempt's acknowledgement is lost and the write is
  re-queued, the replay **reuses the same key**, so the backend collapses the
  two into one committed transaction — a payment can never be charged twice.
- The backend `idempotency_keys` table stores the first **2xx** response and
  replays it for any later request with the same key. 4xx/5xx **release** the
  key so a queued op can still succeed once conditions are ready.

### Durability & retry
- `OutboxOps` is a real SQLite table (FIFO by autoincrement id). Pending writes
  survive app kill / device restart / power loss.
- Failures back off exponentially. A permanent 4xx is **dead-lettered** and
  surfaced to the user (retry/discard) — never silently dropped.
- On reconnect the queue drains **immediately** (skipping accrued backoff — a
  connectivity change is new information), automatically, with no user action.

---

## 4. Reactivity — no manual refresh (IMPLEMENTED)

`data_sync.dart` maps a request path to the entities it affects (plus a
dependency cascade, plus the always-refreshed dashboard/report aggregates).
After any write — online or offline — the affected entities are "bumped", and
every provider that declared `syncOn(ref, {…})` refetches. Offline, that refetch
is served from the (optimistically patched) local cache. So recording a payment
updates the payment screen, the customer balance, history, and the dashboard
without a Refresh button.

---

## 5. Connectivity & error UX (IMPLEMENTED)

- `isOnlineProvider` is correct from the first frame.
- The app-wide banner shows **Offline** / **Syncing N…** / **N need attention**,
  with a sheet to sync now, retry, or discard.
- `apiErrorMessage()` converts every connectivity failure into plain language
  and surfaces the backend's real message for genuine server errors. Raw
  `DioException` / `SocketException` / "Failed host lookup" never reach the user.

---

## 6. First-run vs. returning (IMPLEMENTED)

- **Offline + has local data** → screens show the last-synced data.
- **Offline + never synced** → a clean "connect once to download this" message,
  not a technical error and not an infinite spinner.

The app does not claim the whole database is available offline when it has never
synced — only what has actually been downloaded is served.

---

## 7. Multi-device, two-way sync & conflict resolution (PARTIAL / PLANNED)

**Implemented today**
- Independent offline work per device with durable queues.
- Idempotent replay so retries/lost-acks don't duplicate records or payments.
- Globally-unique internal identity: locally-created records use a client
  **UUID** as their permanent id (never a human business number), so two devices
  creating records offline always represent two distinct records.
- **Cloud → device pull** (`core/sync/sync_pull.dart`): on login, on launch, and
  on every reconnect, `SyncPullService` pulls the authoritative snapshot of the
  core collections (customers, villages, machines, drivers, jobs, bookings,
  employees, pricing-methods, machine-types) into the local SQLite mirror + read
  cache. It is **server-authoritative** (a pull overwrites local cached reads,
  never the reverse) and **flushes the outbox first** (`pullAfterDrain`) so a
  still-pending local write is never transiently hidden. This gives fresh-install
  offline data (no need to visit each screen online first) and multi-user
  convergence when another device changed something while this one was offline.

**Planned (Phase 2 — not yet implemented)**
- **Business-number conflict reconciliation:** if two offline devices mint the
  same human-readable number (e.g. a booking number), detect the conflict,
  preserve both records, let the server assign the authoritative number, and
  update the local record + all its relationships (invoices, payments, jobs)
  while keeping the internal UUID stable. The internal-UUID identity above is the
  foundation for this; the reconciliation step itself is pending.
- **Per-entity conflict policy table:** identity, version/revision, timestamps,
  originating device, op id, dependencies, server-authoritative fields, and the
  chosen conflict behavior for each entity type (never blind last-write-wins
  where the backend is authoritative).

---

## 8. Authentication offline (IMPLEMENTED / to audit in Phase 2)

A previously authenticated session continues to work offline: the token is
cached in memory (warmed at launch) and reads are served from the local cache.
Offline requests fail as connection errors (not 401), so the user is not kicked
to login while offline. Tenant isolation and permissions are unchanged — offline
mode does not weaken security. A fuller audit of every screen's session
assumptions is scheduled for Phase 2.

---

## 9. Testing

Automated (implemented): outbox durability, stable-key replay on reconnect,
dead-letter, FIFO, offline read-cache serving, optimistic cache patch, error
translation (no raw exceptions), backend idempotency (5 end-to-end tests).

Not a substitute for physical-device acceptance: the real Android/iOS/Windows/
macOS offline→reconnect workflow on hardware is the final acceptance criterion
and must be run on a device (see the remediation spec's 25-step checklist).

---

## 10. Status summary

| Requirement | State |
|---|---|
| Offline reads for every screen | ✅ Implemented (HTTP cache + SQLite mirror for core modules) |
| Instant local write + optimistic UI | ✅ Implemented |
| Durable queue surviving restart | ✅ Implemented |
| Automatic sync on reconnect | ✅ Implemented |
| Idempotent, no duplicate payments | ✅ Implemented (client stable key + backend dedupe) |
| No raw network exceptions in UI | ✅ Implemented |
| One sync engine | ✅ Implemented (legacy removed) |
| Reactive dependent-screen refresh | ✅ Implemented |
| Cloud→device global pull | ✅ Implemented (`SyncPullService`, server-authoritative, flush-before-pull) |
| Multi-user convergence (read side) | ✅ Implemented (re-pull on reconnect) |
| Business-number conflict reconciliation | ⏳ Phase 2 (UUID identity foundation done; moot for booking numbers — server allocates atomically) |
| Per-entity conflict policy | ⏳ Phase 2 |
| Physical-device acceptance (4 platforms) | ⏳ Owner/device verification |
