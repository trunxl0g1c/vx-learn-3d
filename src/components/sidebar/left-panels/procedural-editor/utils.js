export function getObjectLabel(object) {
  return object?.name || object?.type || "Unnamed Object";
}

export function getUniqueAnimationOptions(animations = []) {
  const names = new Set();

  return animations.reduce((options, animation, index) => {
    const name = String(
      animation?.name || `Unnamed Animation ${index + 1}`,
    ).trim();

    if (!name || names.has(name)) return options;
    names.add(name);
    options.push({ name, duration: Number(animation?.duration) || 0 });
    return options;
  }, []);
}
