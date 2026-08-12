export const DB_NAME = "viqubed-db";
export const PREVIOUS_BRAND_DB_NAME = ["vi", "cubed-db"].join("");
export const LEGACY_DB_NAME = ["vx", "plore-db"].join("");
export const LEGACY_DB_NAMES = [PREVIOUS_BRAND_DB_NAME, LEGACY_DB_NAME];
export const DB_VERSION = 7;
export const MIGRATION_KEY = "viqubed-indexeddb-migrated-v2";
export const PROJECT_CATALOG_CACHE_KEY = "viqubed-project-catalog-v1";

export const PROJECT_STORE = "projects";
export const FILE_STORE = "files";
export const DRAFT_STORE = "drafts";
export const CHAPTER_STORE = "chapters";
export const FLOW_STORE = "flows";
export const ANIMATION_STORE = "animations";
export const OBJECT_NAME_OVERRIDE_STORE = "objectNameOverrides";
export const PLAYER_SETTINGS_STORE = "playerSettings";
export const PROCEDURE_STORE = "procedures";
export const QUIZ_STORE = "quizzes";
export const SLIDE_STORE = "slides";
export const PROJECT_ID_INDEX = "projectId";
export const PROJECT_ENTITY_INDEX = "projectId_entityId";
export const LAZY_PAYLOAD_VERSION = 1;
export const LAZY_PAYLOAD_TYPE = "application/vnd.viqubed.material+json";

export const ARRAY_MATERIAL_STORES = [
  { field: "chapters", storeName: CHAPTER_STORE },
  { field: "flows", storeName: FLOW_STORE },
  { field: "authoredAnimations", storeName: ANIMATION_STORE },
  {
    field: "objectNameOverrides",
    storeName: OBJECT_NAME_OVERRIDE_STORE,
  },
  { field: "procedures", storeName: PROCEDURE_STORE },
  { field: "quizzes", storeName: QUIZ_STORE },
  { field: "slides", storeName: SLIDE_STORE },
];

export const LAZY_ARRAY_STORE_NAMES = new Set([
  CHAPTER_STORE,
  FLOW_STORE,
  ANIMATION_STORE,
  PROCEDURE_STORE,
  QUIZ_STORE,
  SLIDE_STORE,
]);

export const NORMALIZED_STORE_NAMES = [
  CHAPTER_STORE,
  FLOW_STORE,
  ANIMATION_STORE,
  OBJECT_NAME_OVERRIDE_STORE,
  PLAYER_SETTINGS_STORE,
  PROCEDURE_STORE,
  QUIZ_STORE,
  SLIDE_STORE,
];

export const ALL_STORE_NAMES = [
  PROJECT_STORE,
  FILE_STORE,
  DRAFT_STORE,
  ...NORMALIZED_STORE_NAMES,
];
