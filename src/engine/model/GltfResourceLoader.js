import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const EMBEDDED_TEXTURE_PLUGIN = "VIQUBED_embedded_texture_decoder";
const OBJECT_URL_REVOKE_DELAY_MS = 1500;

function copySourceExtras(texture, sourceDef) {
  if (!texture || !sourceDef) return texture;

  texture.userData = {
    ...(texture.userData || {}),
    ...(sourceDef.extras || {}),
    mimeType: sourceDef.mimeType || texture.userData?.mimeType || "",
  };

  return texture;
}

function createTextureFromImage(image, sourceDef) {
  const texture = new THREE.Texture(image);
  texture.needsUpdate = true;
  return copySourceExtras(texture, sourceDef);
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

async function decodeEmbeddedTexture(bufferView, sourceDef) {
  const blob = new Blob([bufferView], {
    type: sourceDef?.mimeType || "application/octet-stream",
  });

  if (typeof createImageBitmap === "function") {
    try {
      const imageBitmap = await createImageBitmap(blob);
      return createTextureFromImage(imageBitmap, sourceDef);
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

  const originalLoadImageSource = parser.loadImageSource.bind(parser);

  parser.loadImageSource = function loadImageSource(sourceIndex, loader) {
    const sourceDef = this.json?.images?.[sourceIndex];

    if (!sourceDef || sourceDef.bufferView === undefined) {
      return originalLoadImageSource(sourceIndex, loader);
    }

    if (this.sourceCache?.[sourceIndex] !== undefined) {
      return this.sourceCache[sourceIndex].then((texture) => texture.clone());
    }

    const texturePromise = this.getDependency(
      "bufferView",
      sourceDef.bufferView,
    ).then((bufferView) => decodeEmbeddedTexture(bufferView, sourceDef));

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
