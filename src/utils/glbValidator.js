import {
  extractGlbLicenseMetadataFromJson,
  readGlbJsonFromBlob,
} from "../engine/model/GlbLicenseMetadata";

function validateTextures(gltf) {
  const errors = [];
  const warnings = [];

  const textures = gltf.textures || [];

  textures.forEach((texture, index) => {
    const normalSource = texture.source;
    const webpSource = texture.extensions?.EXT_texture_webp?.source;

    if (normalSource === undefined && webpSource === undefined) {
      errors.push(
        `Texture index ${index} tidak memiliki source. Hapus texture kosong lalu export ulang GLB.`
      );
    }
  });

  if (gltf.extensionsRequired?.includes("EXT_texture_webp")) {
    warnings.push("File menggunakan EXT_texture_webp sebagai extension wajib.");
  }

  return { errors, warnings };
}

export async function validateGlbFile(file) {
  if (!file) {
    return {
      valid: false,
      errors: ["File tidak ditemukan."],
      warnings: [],
      info: null,
    };
  }

  if (!file.name.toLowerCase().endsWith(".glb")) {
    return {
      valid: false,
      errors: ["File harus format .glb."],
      warnings: [],
      info: null,
    };
  }

  try {
    const gltf = await readGlbJsonFromBlob(file);

    const textureResult = validateTextures(gltf);

    const info = {
      assetVersion: gltf.asset?.version || "unknown",
      generator: gltf.asset?.generator || "unknown",
      scenes: gltf.scenes?.length || 0,
      nodes: gltf.nodes?.length || 0,
      meshes: gltf.meshes?.length || 0,
      materials: gltf.materials?.length || 0,
      textures: gltf.textures?.length || 0,
      images: gltf.images?.length || 0,
      animations: gltf.animations?.length || 0,
      extensionsUsed: gltf.extensionsUsed || [],
      extensionsRequired: gltf.extensionsRequired || [],
      fileSize: file.size,
      licenseMetadata: extractGlbLicenseMetadataFromJson(gltf, {
        fileName: file.name,
      }),
    };

    return {
      valid: textureResult.errors.length === 0,
      errors: textureResult.errors,
      warnings: textureResult.warnings,
      info,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message || "Gagal membaca GLB."],
      warnings: [],
      info: null,
    };
  }
}