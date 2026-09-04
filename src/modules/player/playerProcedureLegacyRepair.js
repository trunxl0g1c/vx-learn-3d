function isLegacyReverseProcedure(procedure) {
  if (!procedure || procedure.type !== "guided") return false;

  if (procedure.duplicateMode === "reverse") return true;
  if (procedure.reverseDuplicate === true) return true;

  return /\sReverse(?:\s+\d+)?$/i.test(String(procedure.name || "").trim());
}

function syncLegacyAnimatedFields(step, entries) {
  const primary = entries[0] || null;

  return {
    ...step,
    animatedObjects: entries,
    animatedObject: primary?.object || step?.animatedObject || null,
    startTransform: primary?.startTransform || step?.startTransform || null,
    endTransform: primary?.endTransform || step?.endTransform || null,
    startVisible:
      primary?.startVisible !== undefined
        ? primary.startVisible !== false
        : step?.startVisible !== false,
    hideAfterAnimation:
      primary?.hideAfterAnimation !== undefined
        ? primary.hideAfterAnimation === true
        : step?.hideAfterAnimation === true,
  };
}

/**
 * Repairs reverse duplicates produced from older Guided Procedures where the
 * forward Start pose was implicit (`startTransform: null`). Older reverse
 * duplication swapped that null into End, which makes animateStepObjects()
 * resolve false and leaves Player stuck in ANIMATING.
 *
 * The missing reverse End is the object's initial Player pose, which is exactly
 * what the forward procedure used as its implicit Start.
 */
export function repairLegacyReverseProcedureForPlayback({
  procedure,
  scene,
  engine,
  resolveInitialTransform,
} = {}) {
  if (
    !isLegacyReverseProcedure(procedure) ||
    !scene ||
    !engine ||
    typeof resolveInitialTransform !== "function"
  ) {
    return procedure;
  }

  let changed = false;
  const steps = (procedure.steps || []).map((step) => {
    const entries = engine.normalizeAnimatedObjects?.(step, false) || [];
    if (entries.length === 0) return step;

    const nextEntries = entries.map((entry) => {
      if (entry?.endTransform || !entry?.startTransform) return entry;

      const object = engine.findObject?.(scene, entry.object) || null;
      const fallbackEnd = object ? resolveInitialTransform(object) : null;
      if (!fallbackEnd) return entry;

      changed = true;
      return {
        ...entry,
        endTransform: fallbackEnd,
      };
    });

    return syncLegacyAnimatedFields(step, nextEntries);
  });

  if (!changed) return procedure;

  return {
    ...procedure,
    steps,
    legacyReverseTransformRepaired: true,
  };
}

export default repairLegacyReverseProcedureForPlayback;
