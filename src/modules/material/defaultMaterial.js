import { normalizePlayerSettings } from "./playerSettings";
import { createId } from "../../utils/createId";

export const createDefaultMaterial = () => ({
  id: createId(),
  title: "Materi 3D Baru",
  modelUrl: "",
  chapters: [],
  flows: [],
  procedures: [],
  objectNameOverrides: [],
  playerSettings: normalizePlayerSettings(),
});