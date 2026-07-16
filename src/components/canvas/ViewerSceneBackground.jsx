import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getViewerBackground } from "../../utils/viewerBackground";

const MIN_BACKGROUND_SIZE = 256;
const MAX_BACKGROUND_SIZE = 2048;

function clampCanvasSize(value) {
  const numericValue = Math.round(Number(value) || MIN_BACKGROUND_SIZE);
  return Math.min(MAX_BACKGROUND_SIZE, Math.max(MIN_BACKGROUND_SIZE, numericValue));
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = clampCanvasSize(width);
  canvas.height = clampCanvasSize(height);
  return canvas;
}

function createRadialGradientTexture(background, width, height) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
  const size = Math.min(3, Math.max(0.2, Number(background.size || 1)));
  const intensity = Math.min(2, Math.max(0, Number(background.intensity || 1)));

  const innerRadius = maxRadius * Math.min(0.5, 0.05 + size * 0.12);
  const outerRadius = maxRadius * Math.min(1.25, 0.38 + size * (0.28 + intensity * 0.08));

  const gradient = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    Math.max(innerRadius + 1, outerRadius),
  );

  const centerStop = Math.min(0.75, 0.12 + size * 0.12);
  const edgeStop = Math.min(0.98, Math.max(centerStop + 0.05, 0.55 - intensity * 0.12 + size * 0.1));

  gradient.addColorStop(0, background.centerColor);
  gradient.addColorStop(centerStop, background.centerColor);
  gradient.addColorStop(edgeStop, background.edgeColor);
  gradient.addColorStop(1, background.edgeColor);

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createLinearGradientTexture(background, width, height) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const angle = (Number(background.linearRotation || 0) * Math.PI) / 180;
  const directionX = Math.sin(angle);
  const directionY = -Math.cos(angle);
  const halfLength =
    Math.abs(directionX) * (canvas.width / 2) +
    Math.abs(directionY) * (canvas.height / 2);

  const startX = centerX - directionX * halfLength;
  const startY = centerY - directionY * halfLength;
  const endX = centerX + directionX * halfLength;
  const endY = centerY + directionY * halfLength;

  const widthRatio = Math.min(1, Math.max(0.05, Number(background.linearWidth || 0.35)));
  const positionRatio = Math.min(1, Math.max(0, Number(background.linearPosition ?? 0.5)));
  const halfWidth = widthRatio / 2;
  const startStop = Math.max(0, positionRatio - halfWidth);
  const endStop = Math.min(1, positionRatio + halfWidth);

  const gradient = context.createLinearGradient(startX, startY, endX, endY);
  gradient.addColorStop(0, background.linearStartColor);
  gradient.addColorStop(startStop, background.linearStartColor);
  gradient.addColorStop(endStop, background.linearEndColor);
  gradient.addColorStop(1, background.linearEndColor);

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawImageFit(context, image, fit, width, height) {
  if (fit === "stretch") {
    context.drawImage(image, 0, 0, width, height);
    return;
  }

  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;

  if (fit === "contain") {
    const drawWidth = imageRatio > canvasRatio ? width : height * imageRatio;
    const drawHeight = imageRatio > canvasRatio ? width / imageRatio : height;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;
    context.drawImage(image, x, y, drawWidth, drawHeight);
    return;
  }

  const drawWidth = imageRatio > canvasRatio ? height * imageRatio : width;
  const drawHeight = imageRatio > canvasRatio ? height : width / imageRatio;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function createImageBackgroundTexture(background, width, height, onReady) {
  const image = new Image();
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  image.onload = () => {
    context.fillStyle = background.edgeColor || "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawImageFit(context, image, background.imageFit, canvas.width, canvas.height);

    const opacity = Math.min(1, Math.max(0, Number(background.imageOpacity ?? 1)));
    if (opacity < 1) {
      context.fillStyle = `rgba(0, 0, 0, ${1 - opacity})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    texture.needsUpdate = true;
    onReady?.();
  };

  image.onerror = () => {
    context.fillStyle = background.edgeColor || "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    texture.needsUpdate = true;
    onReady?.();
  };

  image.src = background.imageUrl;
  return texture;
}

function createSceneBackground(background, width, height, onReady) {
  if (background.type === "solid") {
    return new THREE.Color(background.solidColor);
  }

  if (background.type === "linearGradient") {
    return createLinearGradientTexture(background, width, height);
  }

  if (background.type === "image" && background.imageUrl) {
    return createImageBackgroundTexture(background, width, height, onReady);
  }

  return createRadialGradientTexture(background, width, height);
}

function disposeSceneBackground(background) {
  if (background?.isTexture) {
    background.dispose?.();
  }
}

export default function ViewerSceneBackground({
  viewerSettings,
  backgroundOverrideColor = null,
}) {
  const { scene, size, invalidate } = useThree();
  const ownedBackgroundRef = useRef(null);
  const background = getViewerBackground(viewerSettings);
  const hasBackgroundOverride = Boolean(backgroundOverrideColor);
  const showHdriBackground =
    !hasBackgroundOverride && Boolean(viewerSettings?.showHdriBackground);

  useEffect(() => {
    if (showHdriBackground) {
      disposeSceneBackground(ownedBackgroundRef.current);
      ownedBackgroundRef.current = null;
      return undefined;
    }

    const previousBackground = scene.background;
    let disposed = false;

    if (typeof window !== "undefined") {
      window.__VX_VIEWER_BACKGROUND_READY__ =
        hasBackgroundOverride ||
        background.type !== "image" ||
        !background.imageUrl;
    }

    const nextBackground = hasBackgroundOverride
      ? new THREE.Color(backgroundOverrideColor)
      : createSceneBackground(
          background,
          size.width,
          size.height,
          () => {
            if (typeof window !== "undefined") {
              window.__VX_VIEWER_BACKGROUND_READY__ = true;
            }

            if (!disposed) invalidate();
          },
        );

    disposeSceneBackground(ownedBackgroundRef.current);
    ownedBackgroundRef.current = nextBackground?.isTexture ? nextBackground : null;
    scene.background = nextBackground;
    invalidate();

    return () => {
      disposed = true;

      if (scene.background === nextBackground) {
        scene.background = previousBackground || null;
      }

      disposeSceneBackground(nextBackground);
      if (ownedBackgroundRef.current === nextBackground) {
        ownedBackgroundRef.current = null;
      }

      invalidate();
    };
  }, [
    scene,
    invalidate,
    showHdriBackground,
    hasBackgroundOverride,
    backgroundOverrideColor,
    size.width,
    size.height,
    background.type,
    background.solidColor,
    background.centerColor,
    background.edgeColor,
    background.intensity,
    background.size,
    background.linearStartColor,
    background.linearEndColor,
    background.linearWidth,
    background.linearPosition,
    background.linearRotation,
    background.imageUrl,
    background.imageFit,
    background.imageOpacity,
  ]);

  return null;
}
