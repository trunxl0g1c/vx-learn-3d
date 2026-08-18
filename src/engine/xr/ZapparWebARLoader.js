const ZAPPAR_THREE_VERSION = "4.3.0";

let sdkPromise = null;
let loadedSDK = null;

function normalizeSDK(module) {
  if (!module) return null;
  if (module.Camera && module.InstantWorldTracker) return module;
  if (module.default?.Camera && module.default?.InstantWorldTracker) {
    return module.default;
  }
  return module;
}

function isExpectedSDK(sdk) {
  return Boolean(
    sdk?.Camera &&
      sdk?.InstantWorldTracker &&
      sdk?.InstantWorldAnchorGroup &&
      sdk?.glContextSet,
  );
}

export function isZapparWebARLoaded() {
  return isExpectedSDK(loadedSDK);
}

export async function loadZapparWebAR() {
  if (isExpectedSDK(loadedSDK)) return loadedSDK;
  if (sdkPromise) return sdkPromise;

  sdkPromise = import("@zappar/zappar-threejs")
    .then((module) => {
      const sdk = normalizeSDK(module);
      if (!isExpectedSDK(sdk)) {
        throw new Error(
          "The local @zappar/zappar-threejs package loaded, but the expected Three.js Universal AR API is unavailable.",
        );
      }
      loadedSDK = sdk;
      return sdk;
    })
    .catch((error) => {
      sdkPromise = null;
      const detail = error?.message ? ` ${error.message}` : "";
      throw new Error(
        `Unable to load @zappar/zappar-threejs ${ZAPPAR_THREE_VERSION}.${detail} Run npm install @zappar/zappar-threejs@${ZAPPAR_THREE_VERSION} in the Viqubed project root, then restart Vite.`,
      );
    });

  return sdkPromise;
}

export { ZAPPAR_THREE_VERSION as ZAPPAR_VERSION };
