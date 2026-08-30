# Changelog

All notable changes to ShabooAgri are documented here. Versions refer to the
mobile app (`mobile-app/pubspec.yaml`); backend and web changes ship alongside
the release they support. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [0.8.6+19] — 2026-08-30

Production-grade **offline-first** across the mobile app. Every normal write
(payments, bookings, jobs, field operations, customers, villages, employees,
machines, expenses) now works with no Internet: changes are saved locally first
with an instant optimistic response, then synced automatically when
connectivity returns — no data loss, no duplicate payments, no incorrect
balances. _(PR #4 · merge `3a0ea76`)_

### Added
- **Durable offline outbox** (SQLite, survives app restart): FIFO ordering,
  exponential backoff, dead-letter for permanently rejected writes (surfaced to
  the user, never silently dropped), and automatic reconcile to authoritative
  backend data on sync.
- **Offline reads** — successful GET responses are cached and served when the
  device is offline, so lists and detail screens keep working.
- **Optimistic UI** — an offline create/edit/delete appears in the relevant
  lists immediately, without waiting for the cloud.
- **Backend idempotency middleware** — mutating requests carry a stable
  `Idempotency-Key`; a retry after a lost acknowledgement replays the stored
  successful response instead of re-running the write. This is the guarantee
  that a queued payment can never be charged twice.
- App-wide **sync status banner** (offline / syncing / needs-attention) with a
  sheet to sync now, retry, or discard failed writes.

### Changed
- On reconnect the outbox drains immediately, skipping any backoff accrued
  while offline (a network change is new information).

### Notes
- Only successful (2xx) responses are cached for idempotent replay; 4xx/5xx
  release the key so a queued op can still succeed once conditions are ready.
- Android / iOS / macOS / Windows artifacts are built in CI; app-store
  publication is a separate, manual step and is **not** included in this release.

## [0.8.5+18]

- **Global real-time sync** — after any successful mutation, every open screen
  (web and Flutter) auto-refreshes the affected data via a path-driven cascade
  bus on the HTTP layer, with the backend remaining the single source of truth.
  _(PR #3 · merge `51bb8f5`)_

## [0.8.4+17] — 2026-08-30

- **PIN auth lifecycle** — create PIN, PIN-only quick login, and forgot/reset
  PIN across backend, web, and Flutter, using a non-enumerating OTP flow.
  _(PR #2 · merge `fe0f703`)_

## [0.8.3+16] — 2026-08-29

- **Fixed** — driver dashboard crash ("Could not load dashboard: Something went
  wrong") caused by a stale Flutter binary mishandling the driver `kpis: null`
  scope.

## [0.8.2+15]

- **Android Play release** — signed release AAB (targetSdk 36) with Play
  compliance fixes (self-updater restricted to desktop, no production credential
  logging).
