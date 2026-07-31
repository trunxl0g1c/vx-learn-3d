import JSZip from "jszip";
import { saveAs } from "file-saver";

const VXPACK_VERSION = 2;

const createSafeFileName = (name = "vx-package") => {
  const safeName = String(name || "vx-package")
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return safeName || "vx-package";
};

const sanitizeAssetFileName = (name = "model.glb") => {
  return String(name || "model.glb")
    .replaceAll("\\", "/")
    .split("/")
    .pop()
    .replace(/[^\w.\-() ]+/g, "_");
};

const getPathFileName = (path = "models/model.glb") => {
  return sanitizeAssetFileName(path) || "model.glb";
};

const createPortableProjectMetadata = (project, material) => ({
  name:
    project?.name ||
    material?.projectName ||
    material?.title ||
    "Imported Viqubed Project",
  role: project?.role === "PLAYER" ? "PLAYER" : "EDITOR",
  workspace: project?.workspace || "Default Workspace",
  thumbnail: material?.thumbnail || project?.thumbnail || null,
  status: project?.status || "DRAFT",
  publishVersion: project?.publishVersion || null,
  metadata: project?.metadata || null,
  autosave: project?.autosave || null,
});

const normalizeMaterialForPackage = (material, modelPath) => ({
  ...(material || {}),
  modelUrl: modelPath,
  chapters: Array.isArray(material?.chapters) ? material.chapters : [],
  flows: Array.isArray(material?.flows) ? material.flows : [],
  procedures: Array.isArray(material?.procedures) ? material.procedures : [],
  objectNameOverrides: Array.isArray(material?.objectNameOverrides)
    ? material.objectNameOverrides
    : [],
});

const createModelFile = (blob, fileName, mimeType) => {
  const normalizedType =
    mimeType || blob?.type || "model/gltf-binary";

  if (typeof File === "function") {
    return new File([blob], fileName, {
      type: normalizedType,
      lastModified: Date.now(),
    });
  }

  blob.name = fileName;
  blob.lastModified = Date.now();
  return blob;
};

export const exportVXPack = async ({
  project,
  material,
  modelFile,
  modelFileName,
  viewerSettings,
  scene,
  shaderMode,
  metalness,
  roughness,
  onProgress,
}) => {
  if (!material) {
    throw new Error("Material belum tersedia");
  }

  if (!modelFile) {
    throw new Error("Load model GLB terlebih dahulu");
  }

  onProgress?.(0);

  const zip = new JSZip();
  const resolvedModelFileName = sanitizeAssetFileName(
    modelFile?.name || modelFileName || material?.modelUrl || "model.glb",
  );
  const modelPath = `models/${resolvedModelFileName}`;

  onProgress?.(5);
  zip.file(modelPath, modelFile);
  onProgress?.(20);

  const normalizedViewer = {
    ...(viewerSettings || {}),
    shaderMode,
    metalness,
    roughness,
  };
  const normalizedMaterial = normalizeMaterialForPackage(material, modelPath);

  const manifest = {
    packageType: "vxpack",
    packageVersion: VXPACK_VERSION,
    exportedAt: new Date().toISOString(),
    project: createPortableProjectMetadata(project, normalizedMaterial),
    model: {
      uri: modelPath,
      name: resolvedModelFileName,
      type: modelFile?.type || "model/gltf-binary",
      size: Number(modelFile?.size || 0),
    },
    material: normalizedMaterial,
    viewer: normalizedViewer,
    scene: scene || {},
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  onProgress?.(25);

  const blob = await zip.generateAsync(
    {
      type: "blob",
      compression: "STORE",
    },
    (metadata) => {
      const zipPercent = metadata.percent || 0;
      const totalPercent = 25 + Math.round((zipPercent / 100) * 70);

      onProgress?.(Math.min(totalPercent, 95));
    },
  );

  onProgress?.(98);

  const packageFileName = createSafeFileName(
    project?.name || material?.projectName || material?.title || modelFileName,
  );

  saveAs(blob, `${packageFileName}.vxpack`);
  onProgress?.(100);

  return {
    blob,
    manifest,
  };
};

export const importVXPack = async (file, { createObjectUrl = true } = {}) => {
  if (!file) {
    throw new Error("File VXPACK tidak ditemukan");
  }

  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file("manifest.json");

  if (!manifestFile) {
    throw new Error("manifest.json tidak ditemukan");
  }

  const manifestText = await manifestFile.async("text");
  const rawManifest = JSON.parse(manifestText);
  const isVersionTwo =
    Number(rawManifest?.packageVersion) >= 2 && rawManifest?.material;

  const legacyMaterial = { ...(rawManifest || {}) };
  const legacyProject = legacyMaterial.project || {};
  const legacyViewerSettings = legacyMaterial.viewerSettings || {};
  const legacyScene = legacyMaterial.scene || {};

  delete legacyMaterial.packageType;
  delete legacyMaterial.packageVersion;
  delete legacyMaterial.exportedAt;
  delete legacyMaterial.viewerSettings;
  delete legacyMaterial.scene;
  delete legacyMaterial.project;
  delete legacyMaterial.model;

  const packageProject = isVersionTwo
    ? rawManifest.project || {}
    : legacyProject;
  const packageMaterial = isVersionTwo
    ? rawManifest.material || {}
    : legacyMaterial;
  const packageViewer = isVersionTwo
    ? rawManifest.viewer || {}
    : legacyViewerSettings;
  const packageScene = isVersionTwo
    ? rawManifest.scene || {}
    : legacyScene;
  const modelPath =
    rawManifest?.model?.uri ||
    packageMaterial?.modelUrl ||
    rawManifest?.modelUrl;

  if (!modelPath) {
    throw new Error("Lokasi model GLB tidak ditemukan pada manifest");
  }

  const modelEntry = zip.file(modelPath);

  if (!modelEntry) {
    throw new Error(`Model ${modelPath} tidak ditemukan`);
  }

  const modelBlob = await modelEntry.async("blob");
  const modelFileName =
    rawManifest?.model?.name || getPathFileName(modelPath);
  const modelFile = createModelFile(
    modelBlob,
    modelFileName,
    rawManifest?.model?.type,
  );
  const modelUrl = createObjectUrl ? URL.createObjectURL(modelFile) : null;

  const runtimeMaterial = {
    ...packageMaterial,
    modelUrl: modelUrl || modelPath,
    originalModelUrl: modelPath,
    viewerSettings: packageViewer,
    scene: packageScene,
    packageProject,
    packageType: rawManifest?.packageType || "vxpack",
    packageVersion: Number(rawManifest?.packageVersion || 1),
  };

  return {
    manifest: runtimeMaterial,
    rawManifest,
    project: packageProject,
    material: packageMaterial,
    viewer: packageViewer,
    scene: packageScene,
    modelFile,
    modelUrl,
    modelPath,
  };
};

export const isVXPackFile = (file) => {
  return file?.name?.toLowerCase().endsWith(".vxpack");
};
