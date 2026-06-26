import JSZip from "jszip";
import { saveAs } from "file-saver";

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

export const exportVXPack = async ({
  material,
  modelFile,
  viewerSettings,
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

  const modelFileName = sanitizeAssetFileName(modelFile.name || "model.glb");
  const modelPath = `models/${modelFileName}`;

  onProgress?.(5);

  zip.file(modelPath, modelFile);

  onProgress?.(20);

  const manifest = {
    ...material,
    modelUrl: modelPath,
    packageType: "vxpack",
    packageVersion: 1,
    exportedAt: new Date().toISOString(),
    viewerSettings: {
      ...(viewerSettings || {}),
      shaderMode,
      metalness,
      roughness,
    },
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
    }
  );

  onProgress?.(98);

  const packageFileName = createSafeFileName(
    material.title || modelFile.name || "vx-package"
  );

  saveAs(blob, `${packageFileName}.vxpack`);

  onProgress?.(100);

  return blob;
};

export const importVXPack = async (file) => {
  if (!file) {
    throw new Error("File VXPACK tidak ditemukan");
  }

  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file("manifest.json");

  if (!manifestFile) {
    throw new Error("manifest.json tidak ditemukan");
  }

  const manifestText = await manifestFile.async("text");
  const manifest = JSON.parse(manifestText);

  const modelEntry = zip.file(manifest.modelUrl);

  if (!modelEntry) {
    throw new Error(`Model ${manifest.modelUrl} tidak ditemukan`);
  }

  const modelBlob = await modelEntry.async("blob");
  const modelUrl = URL.createObjectURL(modelBlob);

  return {
    manifest: {
      ...manifest,
      modelUrl,
      originalModelUrl: manifest.modelUrl,
    },
  };
};

export const isVXPackFile = (file) => {
  return file?.name?.toLowerCase().endsWith(".vxpack");
};