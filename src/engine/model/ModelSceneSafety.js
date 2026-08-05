import * as THREE from "three";

const EPSILON = 1e-6;

function finiteNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clampUnit(value, fallback = 0) {
  return THREE.MathUtils.clamp(finiteNumber(value, fallback), 0, 1);
}

function collapseNearZero(value, fallback = 0) {
  const safeValue = finiteNumber(value, fallback);
  return Math.abs(safeValue) <= EPSILON ? 0 : safeValue;
}

function clampPhysicalUnit(value, fallback = 0) {
  return collapseNearZero(clampUnit(value, fallback), fallback);
}

function sanitizeColor(color, fallback = 1) {
  if (!color) return false;

  let changed = false;

  ["r", "g", "b"].forEach((channel) => {
    if (!Number.isFinite(Number(color[channel]))) {
      color[channel] = fallback;
      changed = true;
    }
  });

  return changed;
}

function sanitizeAttenuationColor(color) {
  if (!color) return false;

  let changed = false;

  ["r", "g", "b"].forEach((channel) => {
    const numericValue = Number(color[channel]);
    const safeValue = Number.isFinite(numericValue)
      ? THREE.MathUtils.clamp(numericValue, EPSILON, 1)
      : 1;

    if (color[channel] !== safeValue) {
      color[channel] = safeValue;
      changed = true;
    }
  });

  return changed;
}

function sanitizeVector2(vector, fallback = 1) {
  if (!vector) return false;

  let changed = false;

  if (!Number.isFinite(vector.x)) {
    vector.x = fallback;
    changed = true;
  }

  if (!Number.isFinite(vector.y)) {
    vector.y = fallback;
    changed = true;
  }

  return changed;
}

function sanitizeObjectTransform(object) {
  let changed = false;

  ["x", "y", "z"].forEach((axis) => {
    if (!Number.isFinite(object.position?.[axis])) {
      object.position[axis] = 0;
      changed = true;
    }

    const scaleValue = Number(object.scale?.[axis]);

    if (!Number.isFinite(scaleValue)) {
      object.scale[axis] = 1;
      changed = true;
    } else if (Math.abs(scaleValue) < EPSILON) {
      object.scale[axis] = scaleValue < 0 ? -EPSILON : EPSILON;
      changed = true;
    }
  });

  ["x", "y", "z", "w"].forEach((axis) => {
    if (!Number.isFinite(object.quaternion?.[axis])) {
      object.quaternion.set(0, 0, 0, 1);
      changed = true;
    }
  });

  if (
    object.quaternion &&
    Number.isFinite(object.quaternion.lengthSq?.()) &&
    object.quaternion.lengthSq() < EPSILON * EPSILON
  ) {
    object.quaternion.set(0, 0, 0, 1);
    changed = true;
  } else if (object.quaternion && changed) {
    object.quaternion.normalize?.();
  }

  if (changed) object.updateMatrix?.();
  return changed;
}

function sanitizePhysicalMaterial(material) {
  let changed = false;

  const assign = (key, value) => {
    if (material[key] !== value) {
      material[key] = value;
      changed = true;
    }
  };

  if ("opacity" in material) assign("opacity", clampUnit(material.opacity, 1));
  if ("metalness" in material) assign("metalness", clampUnit(material.metalness));
  if ("roughness" in material) assign("roughness", clampUnit(material.roughness, 1));
  if ("clearcoat" in material) {
    assign("clearcoat", clampPhysicalUnit(material.clearcoat));
  }
  if ("clearcoatRoughness" in material) {
    assign("clearcoatRoughness", clampUnit(material.clearcoatRoughness));
  }
  if ("transmission" in material) {
    assign("transmission", clampPhysicalUnit(material.transmission));
  }
  if ("thickness" in material) {
    assign(
      "thickness",
      Math.max(0, collapseNearZero(material.thickness, 0)),
    );
  }
  if ("ior" in material) {
    assign(
      "ior",
      THREE.MathUtils.clamp(finiteNumber(material.ior, 1.5), 1 + EPSILON, 3),
    );
  }
  if ("iridescence" in material) {
    assign("iridescence", clampPhysicalUnit(material.iridescence));
  }
  if ("iridescenceIOR" in material) {
    assign(
      "iridescenceIOR",
      THREE.MathUtils.clamp(
        finiteNumber(material.iridescenceIOR, 1.3),
        1 + EPSILON,
        3,
      ),
    );
  }
  if ("anisotropy" in material) {
    assign("anisotropy", clampPhysicalUnit(material.anisotropy));
  }
  if ("sheen" in material) {
    assign("sheen", clampPhysicalUnit(material.sheen));
  }
  if ("dispersion" in material) {
    assign(
      "dispersion",
      Math.max(0, collapseNearZero(material.dispersion, 0)),
    );
  }
  if ("reflectivity" in material) {
    assign("reflectivity", clampUnit(material.reflectivity, 0.5));
  }
  if ("specularIntensity" in material) {
    assign("specularIntensity", clampUnit(material.specularIntensity, 1));
  }
  if ("sheenRoughness" in material) {
    assign("sheenRoughness", clampUnit(material.sheenRoughness, 1));
  }

  if ("attenuationDistance" in material) {
    const distance = Number(material.attenuationDistance);
    const safeDistance =
      distance === Infinity || (Number.isFinite(distance) && distance > EPSILON)
        ? distance
        : Infinity;
    assign("attenuationDistance", safeDistance);
  }

  if (Array.isArray(material.iridescenceThicknessRange)) {
    const minimum = Math.max(
      0,
      finiteNumber(material.iridescenceThicknessRange[0], 100),
    );
    const rawMaximum = finiteNumber(material.iridescenceThicknessRange[1], 400);
    const maximum = Math.max(rawMaximum, minimum + EPSILON);

    if (
      material.iridescenceThicknessRange[0] !== minimum ||
      material.iridescenceThicknessRange[1] !== maximum
    ) {
      material.iridescenceThicknessRange = [minimum, maximum];
      changed = true;
    }
  }

  changed = sanitizeVector2(material.normalScale, 1) || changed;
  changed = sanitizeVector2(material.clearcoatNormalScale, 1) || changed;

  [material.color, material.emissive, material.sheenColor, material.specularColor].forEach((color) => {
    changed = sanitizeColor(color) || changed;
  });

  changed = sanitizeAttenuationColor(material.attenuationColor) || changed;

  [
    "bumpScale",
    "displacementScale",
    "displacementBias",
    "envMapIntensity",
    "emissiveIntensity",
    "lightMapIntensity",
    "aoMapIntensity",
  ].forEach((key) => {
    if (key in material && !Number.isFinite(Number(material[key]))) {
      assign(key, key === "envMapIntensity" ? 1 : 0);
    }
  });

  if ("alphaTest" in material) {
    assign("alphaTest", clampUnit(material.alphaTest));
  }

  if (changed) material.needsUpdate = true;
  return changed;
}

function sanitizeMaterial(material) {
  if (!material) return 0;

  const materials = Array.isArray(material) ? material : [material];
  let changedCount = 0;

  materials.forEach((item) => {
    if (item && sanitizePhysicalMaterial(item)) changedCount += 1;
  });

  return changedCount;
}

export function sanitizeLoadedModelScene(scene) {
  if (!scene || scene.userData?.__viqubedSceneSafetyApplied) {
    return scene?.userData?.__viqubedSceneSafetyReport || {
      transforms: 0,
      materials: 0,
    };
  }

  let transformCount = 0;
  let materialCount = 0;

  scene.traverse((object) => {
    if (sanitizeObjectTransform(object)) transformCount += 1;
    materialCount += sanitizeMaterial(object.material);

    if (object.isSpotLight) {
      object.angle = THREE.MathUtils.clamp(
        finiteNumber(object.angle, Math.PI / 4),
        EPSILON,
        Math.PI / 2,
      );
      object.penumbra = clampUnit(object.penumbra);
    }

    if (object.isPointLight || object.isSpotLight) {
      object.distance = Math.max(0, finiteNumber(object.distance, 0));
      object.decay = Math.max(0, finiteNumber(object.decay, 2));
    }

    if (object.isRectAreaLight) {
      object.width = Math.max(EPSILON, finiteNumber(object.width, 1));
      object.height = Math.max(EPSILON, finiteNumber(object.height, 1));
    }
  });

  scene.userData = scene.userData || {};
  scene.userData.__viqubedSceneSafetyApplied = true;
  scene.userData.__viqubedSceneSafetyReport = {
    transforms: transformCount,
    materials: materialCount,
  };

  if (transformCount > 0 || materialCount > 0) {
    console.warn("Viqubed normalized invalid GLB render values.", {
      transforms: transformCount,
      materials: materialCount,
    });
  }

  return scene.userData.__viqubedSceneSafetyReport;
}
