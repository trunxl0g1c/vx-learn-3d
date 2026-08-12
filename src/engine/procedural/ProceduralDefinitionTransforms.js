import { createId } from "../../utils/createId";

function cloneProceduralValue(value) {
  if (value === null || value === undefined) return value;

  if (typeof globalThis.structuredClone === "function") {
    try {
      return globalThis.structuredClone(value);
    } catch {
      // Fall through to the conservative recursive clone below.
    }
  }

  if (Array.isArray(value)) {
    return value.map((entry) => cloneProceduralValue(entry));
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return value.slice(0, value.size, value.type);
  }

  if (value instanceof ArrayBuffer) {
    return value.slice(0);
  }

  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      return new DataView(value.buffer.slice(0));
    }
    return new value.constructor(value);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        cloneProceduralValue(entry),
      ]),
    );
  }

  return value;
}

function createUniqueDuplicateName(name, existingNames = []) {
  const baseName = String(name || "Procedure").trim() || "Procedure";
  const names = new Set(
    (Array.isArray(existingNames) ? existingNames : [])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );

  let candidate = `${baseName} Copy`;
  let suffix = 2;

  while (names.has(candidate.toLowerCase())) {
    candidate = `${baseName} Copy ${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function createUniqueReverseDuplicateName(name, existingNames = []) {
  const baseName = String(name || "Procedure").trim() || "Procedure";
  const names = new Set(
    (Array.isArray(existingNames) ? existingNames : [])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean),
  );

  let candidate = `${baseName} Reverse`;
  let suffix = 2;

  while (names.has(candidate.toLowerCase())) {
    candidate = `${baseName} Reverse ${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function syncStepAnimatedLegacyFields(step, entries) {
  const primary = entries[0] || null;

  return {
    ...step,
    animatedObjects: entries,
    animatedObject: primary?.object || null,
    startTransform: primary?.startTransform || null,
    endTransform: primary?.endTransform || null,
    startVisible: primary?.startVisible !== false,
    hideAfterAnimation: primary?.hideAfterAnimation === true,
  };
}

function reverseNormalizedStepWithHelpers(
  step,
  procedureType,
  { normalizeAnimatedObjects, isAssemblyProcedure, normalizeStep },
  stepIndex = 0,
) {
  const assemblyStep = isAssemblyProcedure(procedureType);
  const entries = normalizeAnimatedObjects(step, assemblyStep);
  const sequential = step?.action?.animatedObjectMode === "sequential";
  const playbackEntries = sequential ? [...entries].reverse() : [...entries];
  const reversedEntries = playbackEntries.map((entry) => ({
    ...cloneProceduralValue(entry),
    startTransform: cloneProceduralValue(entry.endTransform),
    endTransform: cloneProceduralValue(entry.startTransform),
    // A reverse duplicate begins from the authored End pose. Keep the object
    // visible while it travels back to the authored Start pose. If the original
    // Start pose was hidden, hide only after the reverse animation completes.
    startVisible: true,
    hideAfterAnimation: entry.startVisible === false,
  }));

  const reversedStep = syncStepAnimatedLegacyFields(
    {
      ...cloneProceduralValue(step),
      action: {
        ...cloneProceduralValue(step?.action),
        spinTurns: -(Number(step?.action?.spinTurns) || 0),
      },
      procedureType,
      reversePlayback: false,
    },
    reversedEntries,
  );

  // Materialize the reverse as a normal authored step immediately. This keeps
  // animatedObjects and the legacy single-object mirrors in sync before the
  // duplicate is committed/autosaved, instead of relying on a later render to
  // normalize the data.
  return typeof normalizeStep === "function"
    ? normalizeStep(reversedStep, stepIndex, procedureType)
    : reversedStep;
}

/**
 * Materializes a reversed Procedure into ordinary editable authoring data.
 * The returned definition no longer needs a runtime reverse flag: step order,
 * Start/Target transforms and sequential animated-object order are physically
 * reversed in the stored definition, so Editor preview and Player use exactly
 * the same data.
 */
export function materializeReversedProceduralDefinitionWithHelpers(
  procedure,
  { normalizeAnimatedObjects, isAssemblyProcedure, normalizeStep },
) {
  const procedureType = procedure?.type || "guided";
  const sourceSteps = Array.isArray(procedure?.steps) ? procedure.steps : [];

  return {
    ...cloneProceduralValue(procedure),
    settings: {
      ...cloneProceduralValue(procedure?.settings),
      reverseSteps: false,
    },
    steps: [...sourceSteps]
      .reverse()
      .map((step, stepIndex) =>
        reverseNormalizedStepWithHelpers(
          step,
          procedureType,
          {
            normalizeAnimatedObjects,
            isAssemblyProcedure,
            normalizeStep,
          },
          stepIndex,
        ),
      ),
    playbackReversed: false,
  };
}

export function duplicateProceduralDefinitionWithHelpers(
  procedure,
  {
    existingNames = [],
    name = null,
    reverse = false,
    resolveImplicitStartTransform = null,
  } = {},
  {
    normalizeDefinition,
    normalizeStep,
    normalizeAnimatedObjects,
    isAssemblyProcedure,
  },
) {
  const source = normalizeDefinition(procedure, 0);
  const assemblyStep = isAssemblyProcedure(source);
  const duplicatedSteps = (source.steps || []).map((step, stepIndex) => {
    const clonedStep = cloneProceduralValue(step);
    const clonedEntries = normalizeAnimatedObjects(
      clonedStep,
      assemblyStep,
    ).map((entry) => {
      const clonedEntry = {
        ...cloneProceduralValue(entry),
        id: createId("procedure-animated"),
      };

      // Older Guided Procedures can legitimately omit Start because forward
      // playback treats the model's initial/current pose as the implicit Start.
      // A materialized reverse needs that implicit pose as an explicit End,
      // otherwise swapping Start/End creates `endTransform: null` and the
      // animation cannot run.
      if (
        reverse &&
        !clonedEntry.startTransform &&
        typeof resolveImplicitStartTransform === "function"
      ) {
        const implicitStart = resolveImplicitStartTransform(
          clonedEntry.object,
          clonedStep,
          source,
        );

        if (implicitStart) {
          clonedEntry.startTransform = cloneProceduralValue(implicitStart);
        }
      }

      return clonedEntry;
    });

    return normalizeStep(
      syncStepAnimatedLegacyFields(
        {
          ...clonedStep,
          id: createId("procedure-step"),
        },
        clonedEntries,
      ),
      stepIndex,
      source.type,
    );
  });
  const now = new Date().toISOString();
  const requestedName = String(name || "").trim();
  const duplicate = normalizeDefinition(
    {
      ...cloneProceduralValue(source),
      id: createId("procedure"),
      name:
        requestedName ||
        (reverse
          ? createUniqueReverseDuplicateName(source.name, existingNames)
          : createUniqueDuplicateName(source.name, existingNames)),
      settings: {
        ...cloneProceduralValue(source.settings),
        reverseSteps: false,
      },
      steps: duplicatedSteps,
      sourceProcedureId: source.id || null,
      duplicateMode: reverse ? "reverse" : "copy",
      createdAt: now,
      updatedAt: now,
    },
    0,
  );

  if (!reverse) return duplicate;

  const reversed = materializeReversedProceduralDefinitionWithHelpers(duplicate, {
    normalizeAnimatedObjects,
    isAssemblyProcedure,
    normalizeStep,
  });

  // Run one final definition normalization so the reverse duplicate that the
  // Editor receives is already identical to what Player will consume later.
  return normalizeDefinition(reversed, 0);
}

export function createProceduralPlaybackStepWithHelpers(
  step,
  procedureType,
  { reverse = false } = {},
  {
    normalizeStep,
    normalizeAnimatedObjects,
    isAssemblyProcedure,
    normalizeProcedureType,
  },
) {
  const normalizedType = normalizeProcedureType(procedureType);
  const normalized = {
    ...normalizeStep(step, 0, normalizedType),
    procedureType: normalizedType,
  };

  if (!reverse) return normalized;

  return reverseNormalizedStepWithHelpers(
    normalized,
    normalizedType,
    {
      normalizeAnimatedObjects,
      isAssemblyProcedure,
      normalizeStep,
    },
    0,
  );
}

export function createProceduralPlaybackDefinitionWithHelpers(
  procedure,
  helpers,
) {
  // normalizeDefinition materializes legacy reverseSteps data into ordinary
  // reversed authoring data. Playback therefore consumes exactly the same
  // step order/transforms that Editor shows and edits.
  return helpers.normalizeDefinition(procedure, 0);
}
