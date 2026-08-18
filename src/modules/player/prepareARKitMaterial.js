import {
  getAuthoredAnimationFromIndexedDb,
  getChapterFromIndexedDb,
  getFlowFromIndexedDb,
  getProcedureFromIndexedDb,
  getQuizFromIndexedDb,
  getSlideFromIndexedDb,
} from "../project-hub/storage/projectIndexedDb";
import { isLazyMaterialRecord } from "../../engine/project/LazyMaterialRecords";
import {
  normalizeAuthoredAnimationDefinition,
} from "../../engine/animation";
import { normalizeFlowDefinition } from "../../engine/flow";
import { normalizeProceduralDefinition } from "../../engine/procedural";
import { normalizeQuizDefinition } from "../../engine/quiz";
import { normalizeSlideDefinition } from "../../engine/slide";

const RECORD_CONFIG = Object.freeze({
  chapters: {
    getter: getChapterFromIndexedDb,
    normalize: (value) => value,
  },
  flows: {
    getter: getFlowFromIndexedDb,
    normalize: normalizeFlowDefinition,
  },
  authoredAnimations: {
    getter: getAuthoredAnimationFromIndexedDb,
    normalize: normalizeAuthoredAnimationDefinition,
  },
  procedures: {
    getter: getProcedureFromIndexedDb,
    normalize: normalizeProceduralDefinition,
  },
  quizzes: {
    getter: getQuizFromIndexedDb,
    normalize: normalizeQuizDefinition,
  },
  slides: {
    getter: getSlideFromIndexedDb,
    normalize: normalizeSlideDefinition,
  },
});

async function hydrateField(projectId, field, records) {
  const source = Array.isArray(records) ? records : [];
  const config = RECORD_CONFIG[field];
  if (!config || !projectId) return source;

  return Promise.all(
    source.map(async (record) => {
      if (!record?.id || !isLazyMaterialRecord(record, field)) return record;
      const stored = await config.getter(projectId, record.id);
      return stored ? config.normalize(stored) : record;
    }),
  );
}

export async function prepareARKitMaterial(material) {
  if (!material) return null;
  const projectId = material.projectId;
  const entries = await Promise.all(
    Object.keys(RECORD_CONFIG).map(async (field) => [
      field,
      await hydrateField(projectId, field, material[field]),
    ]),
  );

  return {
    ...material,
    ...Object.fromEntries(entries),
  };
}

export default prepareARKitMaterial;
