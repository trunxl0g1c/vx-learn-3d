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


const pendingRendererDisposals = new WeakMap();

/**
 * Cancels a pending final renderer teardown. React StrictMode runs an
 * effect setup -> cleanup -> setup cycle while keeping the same Canvas
 * connected; cancelling here prevents a development-only cleanup from
 * destroying a renderer that is immediately reused.
 */
export function cancelScheduledWebGLRendererDisposal(renderer) {
  if (!renderer) return;

  const timer = pendingRendererDisposals.get(renderer);
  if (timer !== undefined) {
    globalThis.clearTimeout?.(timer);
    pendingRendererDisposals.delete(renderer);
  }
}

/**
 * Performs a final, route-level WebGL teardown after an R3F Canvas has really
 * left the DOM. R3F already disposes its renderer, but Chromium can retain a
 * large WebGL high-water allocation for texture-heavy GLBs. This second pass
 * clears renderer caches, explicitly loses the detached context and shrinks
 * the detached canvas backing store.
 *
 * The `canvas.isConnected` check is deliberate: it makes this safe with React
 * StrictMode and with ordinary effect re-runs while the Canvas is still live.
 */
export function scheduleFinalWebGLRendererDisposal(
  renderer,
  canvas = renderer?.domElement,
  { delayMs = 32 } = {},
) {
  if (!renderer || !canvas) return () => {};

  cancelScheduledWebGLRendererDisposal(renderer);

  const timer = globalThis.setTimeout?.(() => {
    pendingRendererDisposals.delete(renderer);

    // StrictMode cleanup or an effect dependency refresh: the Canvas is still
    // owned by the document, so do not destroy its context.
    if (canvas.isConnected) return;

    try {
      renderer.setAnimationLoop?.(null);
    } catch {
      // Best-effort teardown.
    }

    try {
      renderer.renderLists?.dispose?.();
    } catch {
      // Best-effort teardown.
    }

    try {
      renderer.properties?.dispose?.();
    } catch {
      // Three.js internals differ between releases.
    }

    try {
      renderer.info?.reset?.();
    } catch {
      // Best-effort teardown.
    }

    try {
      renderer.dispose?.();
    } catch {
      // R3F may already have disposed this renderer.
    }

    // Explicit context loss releases all GPU objects belonging to this Editor
    // or Player Canvas in one operation. The expected-loss guard suppresses
    // Three.js' normal runtime context-loss warning during this intentional
    // teardown.
    try {
      armExpectedWebGLContextLoss(canvas);
      const context = renderer.getContext?.();
      if (!context?.isContextLost?.()) {
        renderer.forceContextLoss?.();
      }
    } catch {
      // Context may already have been lost by R3F's own unmount cleanup.
    }

    // A detached high-DPI canvas can keep a sizeable native backing store.
    // Shrinking it is safe because this path only runs after it left the DOM.
    try {
      canvas.width = 1;
      canvas.height = 1;
    } catch {
      // Best-effort teardown.
    }
  }, Math.max(0, Number(delayMs) || 0));

  if (timer !== undefined) {
    pendingRendererDisposals.set(renderer, timer);
  }

  return () => cancelScheduledWebGLRendererDisposal(renderer);
}
