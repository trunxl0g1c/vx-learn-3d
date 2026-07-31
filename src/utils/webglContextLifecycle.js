const EXPECTED_CONTEXT_LOSS_TTL_MS = 1800;
const expectedContextLossUntil = new WeakMap();

function now() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }

  return Date.now();
}

export function armExpectedWebGLContextLoss(
  canvas,
  ttlMs = EXPECTED_CONTEXT_LOSS_TTL_MS,
) {
  if (!canvas) return;

  expectedContextLossUntil.set(
    canvas,
    now() + Math.max(Number(ttlMs) || EXPECTED_CONTEXT_LOSS_TTL_MS, 250),
  );
}

export function clearExpectedWebGLContextLoss(canvas) {
  if (!canvas) return;
  expectedContextLossUntil.delete(canvas);
}

export function isExpectedWebGLContextLoss(canvas) {
  if (!canvas) return false;

  const expiresAt = expectedContextLossUntil.get(canvas);
  if (!expiresAt) return false;

  if (now() <= expiresAt) return true;

  expectedContextLossUntil.delete(canvas);
  return false;
}

/**
 * Three.js installs its own non-capture `webglcontextlost` listener and logs
 * every loss, including the intentional `forceContextLoss()` performed by R3F
 * when a Canvas is unmounted. This capture listener only intercepts losses that
 * were explicitly armed during teardown. Unexpected GPU/context losses still
 * reach Three.js and the regular Viqubed recovery listeners.
 */
export function installExpectedWebGLContextLossGuard(canvas) {
  if (!canvas) return () => {};

  clearExpectedWebGLContextLoss(canvas);

  const handleContextLostCapture = (event) => {
    if (!isExpectedWebGLContextLoss(canvas)) return;

    // The renderer is already being intentionally disposed. Prevent Three.js'
    // normal context-loss listener from reporting this as a runtime failure.
    event.stopImmediatePropagation();
  };

  canvas.addEventListener(
    "webglcontextlost",
    handleContextLostCapture,
    true,
  );

  return ({ delayed = false } = {}) => {
    const remove = () => {
      canvas.removeEventListener(
        "webglcontextlost",
        handleContextLostCapture,
        true,
      );
      clearExpectedWebGLContextLoss(canvas);
    };

    if (!delayed) {
      remove();
      return;
    }

    // Keep the capture guard alive briefly because R3F disposes the renderer
    // immediately after descendants finish their effect cleanups.
    globalThis.setTimeout?.(remove, EXPECTED_CONTEXT_LOSS_TTL_MS);
  };
}
