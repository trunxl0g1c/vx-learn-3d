import * as THREE from "three";

const PANEL_WIDTH = 0.76;
const PANEL_HEIGHT = 0.5;
const PANEL_RESOLUTION = Object.freeze({ width: 1024, height: 672 });
const BUTTON_HEIGHT = 0.075;
const BUTTON_GAP = 0.012;
const BUTTON_Y = -0.205;
const PANEL_DEPTH = 0.002;
const HOVER_TINT = new THREE.Color("#bcefff");
const NORMAL_TINT = new THREE.Color("#ffffff");

function createCanvas(width, height) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function drawWrappedText(
  context,
  text,
  { x, y, maxWidth, lineHeight, maxLines = 4 },
) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return y;

  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length > 0) {
    let finalLine = visibleLines[visibleLines.length - 1];
    while (
      finalLine.length > 1 &&
      context.measureText(`${finalLine}…`).width > maxWidth
    ) {
      finalLine = finalLine.slice(0, -1);
    }
    visibleLines[visibleLines.length - 1] = `${finalLine.trim()}…`;
  }

  visibleLines.forEach((entry, index) => {
    context.fillText(entry, x, y + index * lineHeight);
  });
  return y + visibleLines.length * lineHeight;
}

function createPanelTexture(viewModel = {}) {
  const canvas = createCanvas(PANEL_RESOLUTION.width, PANEL_RESOLUTION.height);
  if (!canvas) return null;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  roundedRect(context, 8, 8, canvas.width - 16, canvas.height - 16, 42);
  context.fillStyle = "rgba(7, 15, 28, 0.94)";
  context.fill();
  context.strokeStyle = "rgba(89, 215, 255, 0.55)";
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = "#59d7ff";
  context.font = "700 28px Arial, sans-serif";
  context.fillText(String(viewModel.eyebrow || "VIQUBED XR"), 56, 74);

  context.fillStyle = "#ffffff";
  context.font = "700 48px Arial, sans-serif";
  drawWrappedText(context, viewModel.title || "XR Player", {
    x: 56,
    y: 142,
    maxWidth: 910,
    lineHeight: 54,
    maxLines: 2,
  });

  context.fillStyle = "rgba(226, 232, 240, 0.88)";
  context.font = "400 29px Arial, sans-serif";
  drawWrappedText(context, viewModel.body || "", {
    x: 56,
    y: 264,
    maxWidth: 910,
    lineHeight: 39,
    maxLines: 4,
  });

  if (viewModel.progress) {
    context.fillStyle = "rgba(148, 163, 184, 0.95)";
    context.font = "700 25px Arial, sans-serif";
    context.fillText(String(viewModel.progress), 56, 458);
  }

  if (viewModel.status) {
    roundedRect(context, 56, 490, 912, 72, 18);
    context.fillStyle = "rgba(89, 215, 255, 0.09)";
    context.fill();
    context.strokeStyle = "rgba(89, 215, 255, 0.22)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "rgba(226, 232, 240, 0.9)";
    context.font = "600 24px Arial, sans-serif";
    drawWrappedText(context, viewModel.status, {
      x: 78,
      y: 533,
      maxWidth: 866,
      lineHeight: 29,
      maxLines: 1,
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createButtonTexture(label, { active = false, disabled = false } = {}) {
  const canvas = createCanvas(512, 160);
  if (!canvas) return null;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  roundedRect(context, 4, 4, canvas.width - 8, canvas.height - 8, 34);
  context.fillStyle = disabled
    ? "rgba(51, 65, 85, 0.76)"
    : active
      ? "rgba(8, 145, 178, 0.96)"
      : "rgba(30, 41, 59, 0.96)";
  context.fill();
  context.strokeStyle = disabled
    ? "rgba(100, 116, 139, 0.35)"
    : active
      ? "rgba(103, 232, 249, 0.95)"
      : "rgba(148, 163, 184, 0.38)";
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = disabled ? "rgba(148, 163, 184, 0.55)" : "#f8fafc";
  context.font = "700 38px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(label || ""), canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createButtonMesh(button, index, total) {
  const safeTotal = Math.max(1, total);
  const usableWidth = PANEL_WIDTH - BUTTON_GAP * (safeTotal + 1);
  const width = usableWidth / safeTotal;
  const x =
    -PANEL_WIDTH / 2 +
    BUTTON_GAP +
    width / 2 +
    index * (width + BUTTON_GAP);
  const texture = createButtonTexture(button.label, {
    active: button.active,
    disabled: button.disabled || !button.action,
  });
  const geometry = new THREE.PlaneGeometry(width, BUTTON_HEIGHT);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, BUTTON_Y, PANEL_DEPTH * 3);
  mesh.renderOrder = 10003;
  mesh.frustumCulled = false;
  mesh.userData = {
    ...(mesh.userData || {}),
    __vxInternal: true,
    __viqubedXRUI: true,
    xrAction: button.action || null,
    xrDisabled: Boolean(button.disabled || !button.action),
  };
  return mesh;
}

export function createXRSpatialPanel(viewModel = {}) {
  const group = new THREE.Group();
  group.name = "VIQUBED_XR_SPATIAL_PANEL";
  group.userData.__vxInternal = true;
  group.userData.__viqubedXRUIRoot = true;
  group.renderOrder = 10000;

  const panelTexture = createPanelTexture(viewModel);
  const panelGeometry = new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT);
  const panelMaterial = new THREE.MeshBasicMaterial({
    map: panelTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.name = "VIQUBED_XR_PANEL_SURFACE";
  panel.position.z = PANEL_DEPTH;
  panel.renderOrder = 10001;
  panel.frustumCulled = false;
  panel.userData.__vxInternal = true;
  panel.raycast = () => null;
  group.add(panel);

  const buttons = Array.isArray(viewModel.buttons)
    ? viewModel.buttons.slice(0, 7)
    : [];
  buttons.forEach((button, index) => {
    group.add(createButtonMesh(button, index, buttons.length));
  });

  return group;
}

export function disposeXRSpatialPanel(group) {
  if (!group) return;
  group.traverse?.((child) => {
    if (child.geometry?.dispose) child.geometry.dispose();
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.filter(Boolean).forEach((material) => {
      material.map?.dispose?.();
      material.dispose?.();
    });
  });
}

export function getXRSpatialPanelTargetPose({
  viewerPosition,
  viewerQuaternion,
  mode = "vr",
}) {
  if (!viewerPosition || !viewerQuaternion) return null;

  // Keep the primary XR panel inside the headset's central field of view.
  // A previous left-biased offset could make the whole panel easy to miss,
  // especially on narrower browser/headset FOVs.
  const localOffset =
    mode === "ar"
      ? new THREE.Vector3(0, -0.18, -0.72)
      : new THREE.Vector3(0, -0.2, -0.82);
  const worldOffset = localOffset.applyQuaternion(viewerQuaternion);

  return {
    position: viewerPosition.clone().add(worldOffset),
    quaternion: viewerQuaternion.clone(),
  };
}

export function setXRRayFromInputEvent({
  event,
  referenceSpace,
  raycaster,
  origin,
  direction,
  quaternion = null,
}) {
  const sourceEvent = event?.data || event || null;
  const frame = sourceEvent?.frame || null;
  const targetRaySpace = sourceEvent?.inputSource?.targetRaySpace || null;

  if (
    !frame ||
    !targetRaySpace ||
    !referenceSpace ||
    !raycaster ||
    !origin ||
    !direction ||
    typeof frame.getPose !== "function"
  ) {
    return false;
  }

  let pose = null;
  try {
    pose = frame.getPose(targetRaySpace, referenceSpace);
  } catch {
    return false;
  }

  const transform = pose?.transform;
  const position = transform?.position;
  const orientation = transform?.orientation;
  if (!position || !orientation) return false;

  origin.set(position.x, position.y, position.z);
  const rayQuaternion = quaternion || new THREE.Quaternion();
  rayQuaternion.set(
    orientation.x,
    orientation.y,
    orientation.z,
    orientation.w,
  );
  direction.set(0, 0, -1).applyQuaternion(rayQuaternion).normalize();
  raycaster.set(origin, direction);
  return true;
}

export function findXRUIActionHit({
  root,
  raycaster,
  origin,
  direction,
}) {
  if (!root?.visible || !raycaster || !origin || !direction) return null;
  raycaster.set(origin, direction);
  const hits = raycaster.intersectObject(root, true);
  return (
    hits.find(
      (entry) =>
        entry.object?.userData?.__viqubedXRUI &&
        entry.object?.userData?.xrAction &&
        !entry.object?.userData?.xrDisabled,
    ) || null
  );
}

export function setXRUIHovered(object, hovered) {
  if (!object?.userData?.__viqubedXRUI || !object.material) return;
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];
  materials.filter(Boolean).forEach((material) => {
    if (!material.color) return;
    material.color.copy(hovered ? HOVER_TINT : NORMAL_TINT);
    material.needsUpdate = true;
  });
}

export function createXRSelectionIndicator(color = 0x59d7ff) {
  const box = new THREE.Box3();
  const helper = new THREE.Box3Helper(box, color);
  helper.name = "VIQUBED_XR_SELECTION_INDICATOR";
  helper.visible = false;
  helper.renderOrder = 10010;
  helper.frustumCulled = false;
  helper.userData.__vxInternal = true;
  helper.userData.__viqubedXRSelectionIndicator = true;
  return helper;
}

export function updateXRSelectionIndicator(helper, targetObject) {
  if (!helper) return false;
  if (!targetObject || targetObject.visible === false) {
    helper.visible = false;
    return false;
  }

  targetObject.updateWorldMatrix?.(true, true);
  const box = new THREE.Box3().setFromObject(targetObject);
  if (box.isEmpty()) {
    helper.visible = false;
    return false;
  }

  helper.box.copy(box);
  helper.visible = true;
  helper.updateMatrixWorld?.(true);
  return true;
}

export function disposeXRSelectionIndicator(helper) {
  if (!helper) return;
  helper.geometry?.dispose?.();
  helper.material?.dispose?.();
}
