import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

function isExrFile(name = "") {
  return String(name).toLowerCase().endsWith(".exr");
}

export default function CustomHdriEnvironment({
  viewerSettings,
  backgroundEnabled = true,
}) {
  const { gl, scene, invalidate } = useThree();
  const customHdri = viewerSettings?.customHdri;
  const dataUrl = customHdri?.dataUrl;
  const fileName = customHdri?.name || "custom.hdr";
  const showBackground =
    backgroundEnabled && Boolean(viewerSettings?.showHdriBackground);

  useEffect(() => {
    if (!dataUrl) return undefined;

    let cancelled = false;
    let pmremGenerator = null;
    let envMap = null;
    let sourceTexture = null;
    const previousEnvironment = scene.environment;
    const previousBackground = scene.background;
    const Loader = isExrFile(fileName) ? EXRLoader : RGBELoader;
    const loader = new Loader();

    loader.load(
      dataUrl,
      (texture) => {
        if (cancelled) {
          texture.dispose?.();
          return;
        }

        sourceTexture = texture;
        sourceTexture.mapping = THREE.EquirectangularReflectionMapping;
        pmremGenerator = new THREE.PMREMGenerator(gl);
        pmremGenerator.compileEquirectangularShader?.();
        envMap = pmremGenerator.fromEquirectangular(sourceTexture).texture;

        scene.environment = envMap;
        // AR camera components own scene.background. When background rendering
        // is disabled, preserve whichever background is already installed
        // instead of clearing it to null after an async HDRI load.
        if (backgroundEnabled) {
          scene.background = showBackground ? envMap : null;
        }

        if ("environmentIntensity" in scene) {
          scene.environmentIntensity = Number(viewerSettings?.envIntensity ?? 1);
        }

        invalidate();
      },
      undefined,
      (error) => {
        console.error("Gagal memuat custom HDRI:", error);
      },
    );

    return () => {
      cancelled = true;
      scene.environment = previousEnvironment;
      if (backgroundEnabled) {
        scene.background = previousBackground;
      }
      sourceTexture?.dispose?.();
      envMap?.dispose?.();
      pmremGenerator?.dispose?.();
      invalidate();
    };
  }, [
    dataUrl,
    fileName,
    gl,
    scene,
    invalidate,
    showBackground,
    backgroundEnabled,
    viewerSettings?.envIntensity,
  ]);

  return null;
}
