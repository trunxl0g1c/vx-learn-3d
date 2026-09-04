// Production should be 60 * 60 * 1000 (1 hour). Set to 5 minutes right now
// for testing — MUST match CONTENT_LOCK_TIMEOUT_MS in vxcubed-be's
// src/content-lock/content-lock.constants.ts (no endpoint exposes this
// value, so the two are kept in sync by hand — see that file's comment).
export const CONTENT_LOCK_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

// ~3 heartbeats per timeout window during testing. Scale this up (e.g. to
// 5 minutes) when the timeout above goes back to 1 hour.
export const CONTENT_LOCK_HEARTBEAT_INTERVAL_MS = 20 * 1000;

// How often WorkspaceContentTab polls for who's currently editing what.
export const CONTENT_LOCK_PRESENCE_POLL_INTERVAL_MS = 15 * 1000;

// How often the local idle-detector checks elapsed idle time against
// CONTENT_LOCK_IDLE_TIMEOUT_MS.
export const CONTENT_LOCK_IDLE_CHECK_INTERVAL_MS = 5 * 1000;
