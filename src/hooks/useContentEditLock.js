import { useCallback, useEffect, useRef, useState } from "react";
import {
  acquireContentLockRequest,
  getContentLockStatusRequest,
  heartbeatContentLockRequest,
  releaseContentLockRequest,
} from "../modules/project-hub/api/contentLocks";
import { API_BASE_URL } from "../lib/apiClient";
import {
  CONTENT_LOCK_HEARTBEAT_INTERVAL_MS,
  CONTENT_LOCK_IDLE_CHECK_INTERVAL_MS,
  CONTENT_LOCK_IDLE_TIMEOUT_MS,
} from "../constants/contentLock";

const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "mousedown",
  "wheel",
  "touchstart",
];

// Best-effort release fired from a beforeunload handler — axios doesn't
// support `keepalive`, so this bypasses apiClient and hits the endpoint
// directly with a plain fetch. Uses fetch+keepalive rather than
// navigator.sendBeacon because sendBeacon is POST-only and this is a
// DELETE; the server-side stale timeout is the real backstop if the
// browser tears down before this has a chance to complete.
function releaseLockBeacon(contentId) {
  if (!contentId) return;

  try {
    fetch(new URL("/content-locks", API_BASE_URL), {
      method: "DELETE",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    }).catch(() => {});
  } catch {
    // Nothing else to do if fetch itself throws synchronously (e.g. an
    // unsupported environment) — this was always best-effort.
  }
}

// Acquires an exclusive edit lock on `remoteContentId` for as long as this
// hook stays mounted with that id, heartbeats it on an interval, watches
// for local inactivity, and reports two independent outcomes the caller
// renders from instead of the normal editor UI:
//   - lockConflict: someone else already holds the lock (acquire got a 409)
//   - kicked: this session lost the lock after having it — either the
//     local idle timer tripped, or a heartbeat came back 410 (revoked by
//     the workspace owner, or gone stale after a suspended/backgrounded tab)
export function useContentEditLock({ remoteContentId, projectId }) {
  const [lockConflict, setLockConflict] = useState(null);
  const [kicked, setKicked] = useState(null);
  const lastActivityRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const idleIntervalRef = useRef(null);

  const dismissKicked = useCallback(() => setKicked(null), []);

  useEffect(() => {
    const active = Boolean(remoteContentId) && projectId !== "demo";

    if (!active) return undefined;

    let cancelled = false;
    lastActivityRef.current = Date.now();

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    function stopHeartbeat() {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }

    function stopIdleWatch() {
      if (idleIntervalRef.current) {
        clearInterval(idleIntervalRef.current);
        idleIntervalRef.current = null;
      }
    }

    function startHeartbeat() {
      stopHeartbeat();
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          await heartbeatContentLockRequest({ contentId: remoteContentId });
        } catch (error) {
          if (cancelled) return;

          if (error?.response?.status === 410) {
            stopHeartbeat();
            stopIdleWatch();
            setKicked({ reason: "revoked" });
          } else {
            console.error("Content lock heartbeat failed:", error);
          }
        }
      }, CONTENT_LOCK_HEARTBEAT_INTERVAL_MS);
    }

    function startIdleWatch() {
      stopIdleWatch();
      idleIntervalRef.current = setInterval(() => {
        const idleFor = Date.now() - lastActivityRef.current;

        if (idleFor >= CONTENT_LOCK_IDLE_TIMEOUT_MS) {
          stopHeartbeat();
          stopIdleWatch();
          setKicked({ reason: "idle" });
          releaseLockBeacon(remoteContentId);
        }
      }, CONTENT_LOCK_IDLE_CHECK_INTERVAL_MS);
    }

    async function acquire() {
      try {
        await acquireContentLockRequest({ contentId: remoteContentId });
        if (cancelled) return;

        startHeartbeat();
        startIdleWatch();
      } catch (error) {
        if (cancelled) return;

        if (error?.response?.status === 409) {
          try {
            const status = await getContentLockStatusRequest({
              contentId: remoteContentId,
            });

            if (!cancelled) {
              setLockConflict({
                lockedByUser: status?.lockedByUser || null,
                lockedAt: status?.lockedAt || null,
              });
            }
          } catch {
            if (!cancelled) {
              setLockConflict({ lockedByUser: null, lockedAt: null });
            }
          }

          return;
        }

        console.error("Failed to acquire content edit lock:", error);
      }
    }

    function handleBeforeUnload() {
      releaseLockBeacon(remoteContentId);
    }

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markActivity, { passive: true }),
    );
    window.addEventListener("beforeunload", handleBeforeUnload);

    acquire();

    return () => {
      cancelled = true;
      stopHeartbeat();
      stopIdleWatch();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, markActivity),
      );
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Idempotent no-op on the backend if this session never actually held
      // the lock (e.g. it hit a 409 conflict) — safe to call unconditionally.
      releaseContentLockRequest({ contentId: remoteContentId }).catch(() => {});

      // Clears stale lockConflict/kicked state before the next content (or
      // "no content") takes over — runs on every deps change, not just
      // unmount, so switching between two contents never leaves the
      // previous one's conflict/kicked state lingering on screen.
      setLockConflict(null);
      setKicked(null);
    };
  }, [remoteContentId, projectId]);

  return { lockConflict, kicked, dismissKicked };
}
