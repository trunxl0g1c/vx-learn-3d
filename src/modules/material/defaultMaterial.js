import { normalizePlayerSettings } from "./playerSettings";
import { normalizeProToolsSettings } from "../../engine/project/ProToolsSettings";
import { createId } from "../../utils/createId";

export const createDefaultMaterial = () => ({
  id: createId(),
  title: "Materi 3D Baru",
  modelUrl: "",
  chapters: [],
  flows: [],
  procedures: [],
  quizzes: [],
  slides: [],
  objectNameOverrides: [],
  playerSettings: normalizePlayerSettings(),
  proToolsSettings: normalizeProToolsSettings(),
});