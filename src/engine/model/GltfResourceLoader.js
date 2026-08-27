import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const EMBEDDED_TEXTURE_PLUGIN = "VIQUBED_embedded_texture_decoder";
const TRACKED_TEXTURES_KEY = "__viqubedTrackedTextures";
const OBJECT_URL_REVOKE_DELAY_MS = 1500;
const DEFAULT_RUNTIME_MAX_TEXTURE_SIZE = 2048;
const HEAVY_MODEL_RUNTIME_MAX_TEXTURE_SIZE = 1024;
const MEDIUM_MODEL_RUNTIME_MAX_TEXTURE_SIZE = 1536;
const HEAVY_MODEL_IMAGE_COUNT = 16;
const MEDIUM_MODEL_IMAGE_COUNT = 8;
const HEAVY_MODEL_ENCODED_IMAGE_BYTES = 96 * 1024 * 1024;
const MEDIUM_MODEL_ENCODED_IMAGE_BYTES = 48 * 1024 * 1024;
const RUNTIME_TEXTURE_LIMIT_KEY = "__viqubedRuntimeTextureLimit";

function copySourceExtras(texture, sourceDef) {
  if (!texture || !sourceDef) return texture;

  texture.userData = {
    ...(texture.userData || {}),
    ...(sourceDef.extras || {}),
    mimeType: sourceDef.mimeType || texture.userData?.mimeType || "",
  };

  return texture;
}

function getTrackedTextures(parser) {
  if (!parser) return null;

  parser.userData = parser.userData || {};
  if (!(parser.userData[TRACKED_TEXTURES_KEY] instanceof Set)) {
    parser.userData[TRACKED_TEXTURES_KEY] = new Set();
  }

  return parser.userData[TRACKED_TEXTURES_KEY];
}

function trackParserTexture(parser, texture) {
  if (texture?.isTexture) {
    getTrackedTextures(parser)?.add(texture);
  }

  return texture;
}

function releaseDecodedImage(image) {
  if (!image) return false;

  if (Array.isArray(image)) {
    image.forEach(releaseDecodedImage);
    return true;
  }

  if (typeof image.close === "function") {
    try {
      image.close();
      return true;
    } catch {
      // ImageBitmap can already be closed by another texture sharing it.
    }
  }

  // Fallback path used only when ImageBitmap decoding was unavailable. Removing
  // the Blob-backed src helps Chromium release the decoded HTMLImageElement.
  if (typeof image.removeAttribute === "function") {
    try {
      image.removeAttribute("src");
    } catch {
      // Best-effort teardown only.
    }
  }

  return false;
}

function disposeParserTexture(texture) {
  if (!texture?.isTexture) return false;

  const source = texture.source;
  const image = source?.data ?? texture.image;

  releaseDecodedImage(image);
  if (Array.isArray(texture.mipmaps)) {
    texture.mipmaps.forEach(releaseDecodedImage);
    texture.mipmaps.length = 0;
  }

  // Break the CPU-side reference even if a parser/cache object survives until
  // the next GC. This is important for large 2K/4K ImageBitmap-backed GLBs.
  if (source && "data" in source) {
    try {
      source.data = null;
    } catch {
      // Some custom Source implementations may expose a read-only value.
    }
  }

  texture.dispose?.();
  return true;
}

function disposeTexturePromise(value) {
  if (!value) return;

  if (typeof value.then === "function") {
    Promise.resolve(value)
      .then((texture) => disposeParserTexture(texture))
      .catch(() => {});
    return;
  }

  disposeParserTexture(value);
}

function getCacheEntries(cache) {
  if (!cache) return [];
  if (cache instanceof Map) return Array.from(cache.values());
  if (typeof cache === "object") return Object.values(cache);
  return [];
}

function clearCacheEntries(cache) {
  if (!cache) return;
  if (typeof cache.clear === "function") {
    cache.clear();
    return;
  }
  if (typeof cache === "object") {
    Object.keys(cache).forEach((key) => {
      delete cache[key];
    });
  }
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}

function readPngDimensions(bytes) {
  if (!bytes || bytes.byteLength < 24) return null;

  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < pngSignature.length; index += 1) {
    if (bytes[index] !== pngSignature[index]) return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);

  return width > 0 && height > 0 ? { width, height } : null;
}

function readJpegDimensions(bytes) {
  if (!bytes || bytes.byteLength < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 8 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.byteLength) break;

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) break;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame && segmentLength >= 7) {
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return width > 0 && height > 0 ? { width, height } : null;
    }

    offset += segmentLength;
  }

  return null;
}

function readEncodedImageDimensions(bufferView, mimeType = "") {
  const bytes = toUint8Array(bufferView);
  if (!bytes) return null;

  if (mimeType === "image/png") return readPngDimensions(bytes);
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return readJpegDimensions(bytes);
  }

  // Signature fallback covers GLBs whose image mimeType metadata is missing.
  return readPngDimensions(bytes) || readJpegDimensions(bytes);
}

function clampTextureLimit(value, fallback = DEFAULT_RUNTIME_MAX_TEXTURE_SIZE) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return fallback;
  return Math.max(256, Math.min(4096, Math.round(numericValue)));
}

function getEncodedImageByteTotal(parser) {
  const images = Array.isArray(parser?.json?.images) ? parser.json.images : [];
  const bufferViews = Array.isArray(parser?.json?.bufferViews)
    ? parser.json.bufferViews
    : [];

  return images.reduce((total, image) => {
    const bufferViewIndex = image?.bufferView;
    if (!Number.isInteger(bufferViewIndex)) return total;
    return total + Number(bufferViews[bufferViewIndex]?.byteLength || 0);
  }, 0);
}

function resolveRuntimeTextureLimit(parser) {
  const explicitLimit = Number(globalThis.__VIQUBED_RUNTIME_MAX_TEXTURE_SIZE__);
  if (Number.isFinite(explicitLimit) && explicitLimit > 0) {
    return clampTextureLimit(explicitLimit);
  }

  const imageCount = Array.isArray(parser?.json?.images)
    ? parser.json.images.length
    : 0;
  const encodedImageBytes = getEncodedImageByteTotal(parser);

  if (
    imageCount >= HEAVY_MODEL_IMAGE_COUNT ||
    encodedImageBytes >= HEAVY_MODEL_ENCODED_IMAGE_BYTES
  ) {
    return HEAVY_MODEL_RUNTIME_MAX_TEXTURE_SIZE;
  }

  if (
    imageCount >= MEDIUM_MODEL_IMAGE_COUNT ||
    encodedImageBytes >= MEDIUM_MODEL_ENCODED_IMAGE_BYTES
  ) {
    return MEDIUM_MODEL_RUNTIME_MAX_TEXTURE_SIZE;
  }

  return DEFAULT_RUNTIME_MAX_TEXTURE_SIZE;
}

function getRuntimeResize(dimensions, maxTextureSize) {
  if (!dimensions || !Number.isFinite(maxTextureSize) || maxTextureSize <= 0) {
    return null;
  }

  const { width, height } = dimensions;
  if (width <= maxTextureSize && height <= maxTextureSize) return null;

  const scale = Math.min(maxTextureSize / width, maxTextureSize / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    sourceWidth: width,
    sourceHeight: height,
  };
}

function annotateRuntimeTextureSize(texture, resize, maxTextureSize) {
  if (!texture) return texture;

  texture.userData = texture.userData || {};
  texture.userData.viqubedRuntimeMaxTextureSize = maxTextureSize;

  if (resize) {
    texture.userData.viqubedRuntimeResized = true;
    texture.userData.viqubedSourceTextureSize = [
      resize.sourceWidth,
      resize.sourceHeight,
    ];
    texture.userData.viqubedRuntimeTextureSize = [resize.width, resize.height];
  }

  return texture;
}

function createTextureFromImage(image, sourceDef, runtimeInfo = null) {
  const texture = new THREE.Texture(image);
  texture.needsUpdate = true;
  copySourceExtras(texture, sourceDef);
  return annotateRuntimeTextureSize(
    texture,
    runtimeInfo?.resize || null,
    runtimeInfo?.maxTextureSize || DEFAULT_RUNTIME_MAX_TEXTURE_SIZE,
  );
}

function loadTextureWithImageElement(blob, sourceDef) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    const revokeLater = () => {
      globalThis.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, OBJECT_URL_REVOKE_DELAY_MS);
    };

    image.onload = () => {
      resolve(createTextureFromImage(image, sourceDef));
      revokeLater();
    };

    image.onerror = (event) => {
      URL.revokeObjectURL(objectUrl);
      reject(
        event instanceof Error
          ? event
          : new Error("Embedded GLB texture could not be decoded."),
      );
    };

    image.decoding = "async";
    image.src = objectUrl;
  });
}

async function decodeEmbeddedTexture(
  bufferView,
  sourceDef,
  maxTextureSize = DEFAULT_RUNTIME_MAX_TEXTURE_SIZE,
) {
  const blob = new Blob([bufferView], {
    type: sourceDef?.mimeType || "application/octet-stream",
  });
  const dimensions = readEncodedImageDimensions(bufferView, sourceDef?.mimeType);
  const resize = getRuntimeResize(dimensions, maxTextureSize);

  if (typeof createImageBitmap === "function") {
    try {
      const imageBitmap = resize
        ? await createImageBitmap(blob, {
            resizeWidth: resize.width,
            resizeHeight: resize.height,
            resizeQuality: "high",
          })
        : await createImageBitmap(blob);

      return createTextureFromImage(imageBitmap, sourceDef, {
        resize,
        maxTextureSize,
      });
    } catch (error) {
      console.warn(
        "Viqubed: ImageBitmap decoding failed; retrying with an image element.",
        error,
      );
    }
  }

  return loadTextureWithImageElement(blob, sourceDef);
}

function installEmbeddedTextureDecoder(parser) {
  if (!parser || parser.userData?.__viqubedEmbeddedTextureDecoderInstalled) {
    return;
  }

  parser.userData = parser.userData || {};
  parser.userData.__viqubedEmbeddedTextureDecoderInstalled = true;
  parser.userData[RUNTIME_TEXTURE_LIMIT_KEY] = resolveRuntimeTextureLimit(parser);

  const originalLoadImageSource = parser.loadImageSource.bind(parser);

  parser.loadImageSource = function loadImageSource(sourceIndex, loader) {
    const sourceDef = this.json?.images?.[sourceIndex];

    if (!sourceDef || sourceDef.bufferView === undefined) {
      return originalLoadImageSource(sourceIndex, loader);
    }

    if (this.sourceCache?.[sourceIndex] !== undefined) {
      return this.sourceCache[sourceIndex].then((texture) =>
        trackParserTexture(this, texture.clone()),
      );
    }

    const texturePromise = this.getDependency(
      "bufferView",
      sourceDef.bufferView,
    )
      .then((bufferView) =>
        decodeEmbeddedTexture(
          bufferView,
          sourceDef,
          this.userData?.[RUNTIME_TEXTURE_LIMIT_KEY] ||
            DEFAULT_RUNTIME_MAX_TEXTURE_SIZE,
        ),
      )
      .then((texture) => trackParserTexture(this, texture));

    this.sourceCache[sourceIndex] = texturePromise;
    return texturePromise;
  };
}

/**
 * Configures one GLTFLoader instance without creating another renderer/canvas.
 * Embedded GLB images are decoded from their bufferView directly, avoiding a
 * temporary blob: fetch that can intermittently fail in Chromium.
 */
export function configureViqubedGltfLoader(loader) {
  if (!loader) return loader;

  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.register((parser) => ({
    name: EMBEDDED_TEXTURE_PLUGIN,
    beforeRoot() {
      installEmbeddedTextureDecoder(parser);
    },
  }));

  return loader;
}

function releaseBinaryExtensionBody(extension) {
  if (!extension || typeof extension !== "object") return 0;

  let releasedBytes = 0;
  const body = extension.body;

  if (body instanceof ArrayBuffer) {
    releasedBytes = body.byteLength;
  } else if (ArrayBuffer.isView(body)) {
    releasedBytes = body.byteLength;
  }

  if ("body" in extension) {
    try {
      extension.body = null;
    } catch {
      // Best-effort only; some extension implementations may freeze fields.
    }
  }

  return releasedBytes;
}

function clearParserRuntimeCache(parser, key) {
  const cache = parser?.[key];
  if (!cache) return 0;

  const count = getCacheEntries(cache).length;

  if (typeof cache.removeAll === "function") {
    cache.removeAll();
  } else {
    clearCacheEntries(cache);
  }

  try {
    parser[key] = null;
  } catch {
    // Ignore non-writable internal fields. Clearing their contents is enough.
  }

  return count;
}

/**
 * Releases GLTFParser-owned CPU resources that are not reachable by traversing
 * the final scene. GLTFParser keeps source textures, primitive/node promises and
 * the KHR_binary_glTF BIN chunk alive independently from the final scene. For a
 * large GLB, the binary body plus cached typed-array views can retain hundreds
 * of megabytes even after WebGL teardown. Call only after the final owner of
 * this GLTF unmounts.
 */
export function disposeViqubedGltfParserResources(parser) {
  if (!parser) {
    return {
      trackedTextures: 0,
      sourceEntries: 0,
      textureEntries: 0,
      parserCacheEntries: 0,
      binaryBytesReleased: 0,
    };
  }

  const trackedTextures = parser.userData?.[TRACKED_TEXTURES_KEY];
  const sourceEntries = getCacheEntries(parser.sourceCache);
  const textureEntries = getCacheEntries(parser.textureCache);
  const trackedTextureCount =
    trackedTextures instanceof Set ? trackedTextures.size : 0;

  if (trackedTextures instanceof Set) {
    trackedTextures.forEach((texture) => disposeParserTexture(texture));
    trackedTextures.clear();
  }

  // The parser caches promises as well as textures. Resolve-and-dispose is safe
  // here because this function only runs after the GLTF has no remaining owner.
  sourceEntries.forEach(disposeTexturePromise);
  textureEntries.forEach(disposeTexturePromise);

  parser.cache?.removeAll?.();
  parser.associations?.clear?.();

  // GLTFParser has several caches outside parser.cache. primitiveCache and the
  // node/mesh caches can keep Geometry, Object3D, Accessor and typed-array
  // dependency graphs alive after the scene has been cleared.
  const runtimeCacheKeys = [
    "sourceCache",
    "textureCache",
    "primitiveCache",
    "nodeCache",
    "meshCache",
    "cameraCache",
    "lightCache",
  ];
  const parserCacheEntries = runtimeCacheKeys.reduce(
    (total, key) => total + clearParserRuntimeCache(parser, key),
    0,
  );

  // GLTFBinaryExtension owns the original BIN ArrayBuffer (`body`). Every
  // bufferView/accessor is a view into this body, so leaving it reachable keeps
  // the raw GLB binary payload alive even after all Three.js resources dispose.
  let binaryBytesReleased = 0;
  const extensions = parser.extensions;
  if (extensions && typeof extensions === "object") {
    Object.values(extensions).forEach((extension) => {
      binaryBytesReleased += releaseBinaryExtensionBody(extension);
    });
  }

  if (parser.userData && typeof parser.userData === "object") {
    delete parser.userData[TRACKED_TEXTURES_KEY];
    delete parser.userData[RUNTIME_TEXTURE_LIMIT_KEY];
  }

  // No owner remains at this point. Break parser -> loader/plugin/json references
  // so a late GC does not need to walk the complete loaded asset graph.
  try {
    parser.extensions = {};
    parser.plugins = {};
    parser.json = null;
    parser.options = null;
    parser.fileLoader = null;
    parser.textureLoader = null;
    parser.textureLoader = null;
    parser.associations = null;
    parser.cache = null;
  } catch {
    // Best-effort cleanup for different Three.js GLTFParser versions.
  }

  return {
    trackedTextures: trackedTextureCount,
    sourceEntries: sourceEntries.length,
    textureEntries: textureEntries.length,
    parserCacheEntries,
    binaryBytesReleased,
  };
}

