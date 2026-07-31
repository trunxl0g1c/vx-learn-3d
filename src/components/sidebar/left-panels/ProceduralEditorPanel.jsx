import { useEffect, useMemo, useState } from "react";
import MaterialIcon from "../../ui/material-icon";
import Button from "../../ui/button";
import ProceduralStepSavedStateSection from "../../procedural/ProceduralStepSavedStateSection";
import ProceduralAnimatedObjectList from "../../procedural/ProceduralAnimatedObjectList";
import {
  getLogicalObjectChildren,
  getLogicalObjectParent,
  getLogicalObjectPath,
  resolveObjectTreeRoot,
} from "../../../utils/objectTreeUtils";

function Section({ title, step, children }) {
  return (
    <section className="rounded-xl border border-secondary-default/60 bg-[#171b1b] p-4">
      <div className="mb-4 flex items-center gap-3">
        {step && (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
            {step}
          </span>
        )}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ ready, children }) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-1 text-[10px]",
        ready
          ? "border-green-400/40 bg-green-500/10 text-green-200"
          : "border-warning-main/40 bg-warning-main/10 text-warning-main",
      ].join(" ")}
    >
      {children}
    </span>
  );
}


function getObjectLabel(object) {
  return object?.name || object?.type || "Unnamed Object";
}

function getUniqueAnimationOptions(animations = []) {
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

function MiniLogicalObjectPicker({
  procedural,
  role,
  title,
  icon,
  assignedReference,
}) {
  const selectedObject = procedural?.selectedLogicalObject || null;
  const assignedObject = procedural?.resolveObjectReference?.(assignedReference) || null;
  const rootObject = resolveObjectTreeRoot(procedural?.modelScene);
  const [browserObject, setBrowserObject] = useState(
    () => selectedObject || assignedObject || rootObject || null,
  );

  useEffect(() => {
    if (selectedObject) setBrowserObject(selectedObject);
  }, [selectedObject?.uuid]);

  useEffect(() => {
    setBrowserObject((current) => current || assignedObject || rootObject || null);
  }, [assignedObject?.uuid, rootObject?.uuid]);

  const currentObject = browserObject || selectedObject || assignedObject || rootObject;
  const parentObject = useMemo(
    () => getLogicalObjectParent(currentObject, rootObject),
    [currentObject, rootObject],
  );
  const childObjects = useMemo(
    () => getLogicalObjectChildren(currentObject),
    [currentObject],
  );
  const objectPath = useMemo(
    () => getLogicalObjectPath(currentObject, rootObject),
    [currentObject, rootObject],
  );

  const currentName = getObjectLabel(currentObject);
  const assignedName = assignedReference?.name || "No object assigned";
  const assigned = Boolean(assignedReference);
  const roleLabel = role === "animated" ? "Animated Object" : "Click Target";

  const browseTo = (object) => {
    if (!object) return;

    setBrowserObject(object);
    procedural?.highlightAuthoringObject?.(object);
  };

  return (
    <div className="rounded-lg border border-secondary-default/50 bg-primary/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">{title}</p>
          <p className="mt-1 truncate text-[10px] text-contrast-grayout">
            {assignedName}
          </p>
        </div>
        <StatusBadge ready={assigned}>
          {assigned ? "Assigned" : "Required"}
        </StatusBadge>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-secondary-default/50 bg-[#111717]">
        <div className="flex items-center gap-2 border-b border-secondary-default/30 px-2 py-2">
          <MaterialIcon name="account_tree" className="size-4 shrink-0 text-secondary-default" />
          <p className="min-w-0 flex-1 truncate text-[10px] text-contrast-grayout">
            {objectPath.length > 0
              ? objectPath.map(getObjectLabel).join(" / ")
              : "Select an object in the viewport"}
          </p>
          <button
            type="button"
            onClick={() => browseTo(selectedObject)}
            disabled={!selectedObject}
            className="grid size-7 shrink-0 place-items-center rounded-md border border-secondary-default/40 text-secondary-default transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            title="Return to viewport selection"
          >
            <MaterialIcon name="my_location" className="size-4" />
          </button>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={() => browseTo(parentObject)}
            disabled={!parentObject}
            className="mb-2 flex w-full items-center gap-2 rounded-md border border-secondary-default/35 px-2 py-2 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <MaterialIcon name="arrow_upward" className="size-4 shrink-0 text-secondary-default" />
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] uppercase tracking-wide text-contrast-grayout">
                Parent
              </span>
              <span className="block truncate text-[11px] font-semibold text-white">
                {parentObject ? getObjectLabel(parentObject) : "Top level"}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2 rounded-md border border-accent-main/60 bg-accent-main/10 px-2 py-2">
            <MaterialIcon name={icon} className="size-4 shrink-0 text-secondary-default" />
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] uppercase tracking-wide text-secondary-default">
                Current candidate · highlighted in viewport
              </span>
              <span className="block truncate text-[11px] font-semibold text-white">
                {currentObject ? currentName : "No object selected"}
              </span>
            </span>
            {currentObject && (
              <span className="rounded-full border border-accent-main/40 px-1.5 py-0.5 text-[8px] text-secondary-default">
                Logical
              </span>
            )}
          </div>

          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
            {childObjects.length > 0 ? (
              childObjects.map((child) => (
                <button
                  key={child.uuid}
                  type="button"
                  onClick={() => browseTo(child)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-white/5"
                >
                  <MaterialIcon name="subdirectory_arrow_right" className="size-4 shrink-0 text-secondary-default" />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white">
                    {getObjectLabel(child)}
                  </span>
                  <MaterialIcon name="chevron_right" className="size-4 shrink-0 text-contrast-grayout" />
                </button>
              ))
            ) : (
              <p className="px-2 py-2 text-[10px] text-contrast-grayout">
                This logical object has no child objects. Use Parent to move up.
              </p>
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="xs"
        variant="cyanOutline"
        className="mt-3 w-full"
        disabled={!currentObject}
        onClick={() => {
          procedural?.highlightAuthoringObject?.(currentObject);
          procedural?.assignObject?.(currentObject, role);
        }}
      >
        <MaterialIcon name={icon} className="size-4" />
        {currentObject
          ? `Use ${currentName} as ${roleLabel}`
          : `Select ${roleLabel.toLowerCase()}`}
      </Button>
    </div>
  );
}

export default function ProceduralEditorPanel({
  procedural,
  selectedObjectName,
  animations = [],
  onBack,
}) {
  const [newProcedureType, setNewProcedureType] = useState("assembly");
  const procedure = procedural?.activeProcedure;
  const step = procedural?.activeStep;
  const animationOptions = useMemo(
    () => getUniqueAnimationOptions(animations),
    [animations],
  );
  const completionAnimation = procedure?.settings?.completionAnimation || {
    name: "",
    autoPlay: true,
    loop: false,
    speed: 1,
  };
  const isAssembly = procedure?.type === "assembly";
  const stepIndex = procedure?.steps?.findIndex((item) => item.id === step?.id) ?? -1;
  const animatedEntries = procedural?.activeAnimatedEntries || [];
  const animatedEntriesReady =
    animatedEntries.length > 0 &&
    animatedEntries.every(
      (entry) => entry.startTransform && entry.endTransform,
    );
  const stepReady = Boolean(
    step?.targetObject &&
      animatedEntriesReady &&
      (!isAssembly || step?.cameraView),
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center gap-2 bg-[#14201f] px-3 pr-14">
        <button
          type="button"
          onClick={() => {
            procedural?.stopAuthoring?.();
            onBack?.();
          }}
          className="grid size-9 place-items-center rounded-lg text-secondary-default hover:bg-white/10"
          title="Back to Pro Tools"
        >
          <MaterialIcon name="arrow_back" className="size-6" />
        </button>
        <div>
          <p className="text-base font-semibold text-white">Procedure Authoring</p>
          <p className="text-[11px] text-contrast-grayout">
            Build guided and assembly training
          </p>
        </div>
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <Section title="Create or Select Procedure" step="1">
          <div className="space-y-2">
            <select
              value={procedural?.activeProcedureId || ""}
              onChange={(event) => procedural?.selectProcedure?.(event.target.value)}
              className="h-10 w-full rounded-lg border border-secondary-default/70 bg-primary px-3 text-sm text-white outline-none"
            >
              <option value="">Select procedure</option>
              {(procedural?.procedures || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.type || "guided"}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                value={newProcedureType}
                onChange={(event) => setNewProcedureType(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-secondary-default/70 bg-primary px-3 text-sm text-white outline-none"
              >
                <option value="assembly">Assembly</option>
                <option value="guided">Guided Procedure</option>
              </select>
              <Button
                size="sm"
                onClick={() => procedural?.createProcedure?.(newProcedureType)}
              >
                <MaterialIcon name="add" className="size-5" />
                New
              </Button>
            </div>
          </div>

          {(procedural?.procedures || []).length === 0 && (
            <p className="mt-3 text-xs leading-5 text-contrast-grayout">
              Create a procedure first. It will appear as one playable material
              in Player.
            </p>
          )}
        </Section>

        {procedure && (
          <>
            <Section title="Procedure Information" step="2">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-contrast-grayout">
                    Procedure Name
                  </span>
                  <input
                    value={procedure.name}
                    onChange={(event) =>
                      procedural.updateProcedure(procedure.id, {
                        name: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs text-contrast-grayout">
                    Procedure Type
                  </span>
                  <select
                    value={procedure.type || "guided"}
                    onChange={(event) =>
                      procedural.updateProcedure(procedure.id, {
                        type: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
                  >
                    <option value="assembly">Assembly</option>
                       <option value="guided">Guided Procedure</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs text-contrast-grayout">
                    Description
                  </span>
                  <textarea
                    value={procedure.description}
                    onChange={(event) =>
                      procedural.updateProcedure(procedure.id, {
                        description: event.target.value,
                      })
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-secondary-default/60 bg-primary p-3 text-sm text-white outline-none"
                    placeholder="Example: Remove all bolts, then open the engine cover."
                  />
                </label>

                <div className="rounded-lg border border-secondary-default/50 bg-primary/50 p-3">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="animation" className="size-5 text-secondary-default" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Animation After Completion
                      </p>
                      <p className="mt-0.5 text-[10px] text-contrast-grayout">
                        Start a GLB animation after the last procedure step.
                      </p>
                    </div>
                  </div>

                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-[11px] text-contrast-grayout">
                      Project Animation
                    </span>
                    <select
                      value={completionAnimation.name || ""}
                      onChange={(event) =>
                        procedural.updateProcedure(procedure.id, {
                          settings: {
                            completionAnimation: {
                              ...completionAnimation,
                              name: event.target.value,
                            },
                          },
                        })
                      }
                      className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
                    >
                      <option value="">No completion animation</option>
                      {animationOptions.map((animation) => (
                        <option key={animation.name} value={animation.name}>
                          {animation.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {completionAnimation.name && (
                    <div className="mt-3 space-y-3">
                      <label className="flex items-center justify-between gap-3 text-xs text-white">
                        <span>Auto Play after completion</span>
                        <input
                          type="checkbox"
                          checked={completionAnimation.autoPlay !== false}
                          onChange={(event) =>
                            procedural.updateProcedure(procedure.id, {
                              settings: {
                                completionAnimation: {
                                  ...completionAnimation,
                                  autoPlay: event.target.checked,
                                },
                              },
                            })
                          }
                          className="size-4 accent-cyan-400"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-3 text-xs text-white">
                        <span>Loop animation</span>
                        <input
                          type="checkbox"
                          checked={completionAnimation.loop === true}
                          onChange={(event) =>
                            procedural.updateProcedure(procedure.id, {
                              settings: {
                                completionAnimation: {
                                  ...completionAnimation,
                                  loop: event.target.checked,
                                },
                              },
                            })
                          }
                          className="size-4 accent-cyan-400"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-[11px] text-contrast-grayout">
                          Speed
                        </span>
                        <select
                          value={String(completionAnimation.speed || 1)}
                          onChange={(event) =>
                            procedural.updateProcedure(procedure.id, {
                              settings: {
                                completionAnimation: {
                                  ...completionAnimation,
                                  speed: Number(event.target.value) || 1,
                                },
                              },
                            })
                          }
                          className="h-9 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-xs text-white outline-none"
                        >
                          {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((speed) => (
                            <option key={speed} value={speed}>
                              {speed}x
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}

                  {animationOptions.length === 0 && (
                    <p className="mt-3 text-[10px] text-warning-main">
                      This GLB does not provide an embedded animation yet.
                    </p>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Procedure Steps" step="3">
              <Button
                type="button"
                size="sm"
                variant="cyanOutline"
                className="w-full"
                onClick={procedural.createStep}
              >
                <MaterialIcon name="add_task" className="size-5" />
                {isAssembly ? "Add Assembly Step" : "Add Procedure Step"}
              </Button>

              <div className="mt-3 space-y-2">
                {(procedure.steps || []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-secondary-default/50 p-4 text-center text-xs text-contrast-grayout">
                    {isAssembly
                      ? "No steps yet. Add the first component to install."
                      : "No steps yet. Add the first object interaction."}
                  </div>
                ) : (
                  procedure.steps.map((item, index) => {
                    const active = item.id === procedural.activeStepId;
                    const itemAnimatedEntries =
                      procedural?.normalizeAnimatedObjects?.(
                        item,
                        isAssembly,
                      ) || item.animatedObjects || [];
                    const ready = Boolean(
                      item.targetObject &&
                        itemAnimatedEntries.length > 0 &&
                        itemAnimatedEntries.every(
                          (entry) =>
                            entry.startTransform && entry.endTransform,
                        ) &&
                        (!isAssembly || item.cameraView),
                    );

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => procedural.setActiveStepId(item.id)}
                        className={[
                          "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                          active
                            ? "border-accent-main bg-accent-main/10"
                            : "border-secondary-default/40 bg-primary/50 hover:border-secondary-default",
                        ].join(" ")}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-white">
                            {item.name}
                          </span>
                          <span className="mt-1 block truncate text-[10px] text-contrast-grayout">
                            {isAssembly ? "Part" : "Click"}: {item.targetObject?.name || "not assigned"}
                          </span>
                          {!isAssembly && (
                            <span className="mt-0.5 block truncate text-[10px] text-contrast-grayout">
                              Animate: {
                                item.animatedObject?.name ||
                                item.targetObject?.name ||
                                "not assigned"
                              }
                            </span>
                          )}
                        </span>
                        <StatusBadge ready={ready}>{ready ? "Ready" : "Setup"}</StatusBadge>
                      </button>
                    );
                  })
                )}
              </div>
            </Section>

            {step && (
              <Section title={`Configure Step ${stepIndex + 1}`} step="4">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs text-contrast-grayout">
                      Step Name
                    </span>
                    <input
                      value={step.name}
                      onChange={(event) =>
                        procedural.updateStep(step.id, { name: event.target.value })
                      }
                      className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs text-contrast-grayout">
                      Instruction in Player
                    </span>
                    <textarea
                      value={step.instruction}
                      onChange={(event) =>
                        procedural.updateStep(step.id, {
                          instruction: event.target.value,
                        })
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border border-secondary-default/60 bg-primary p-3 text-sm text-white outline-none"
                    />
                  </label>

                  <div className="space-y-3">
                    {isAssembly ? (
                      <MiniLogicalObjectPicker
                        key={`${step.id}-assembly-object`}
                        procedural={procedural}
                        role="animated"
                        title="Assembly Object"
                        icon="precision_manufacturing"
                        assignedReference={step.animatedObject || step.targetObject}
                      />
                    ) : (
                      <>
                        <MiniLogicalObjectPicker
                          key={`${step.id}-click-target`}
                          procedural={procedural}
                          role="target"
                          title="Click Target"
                          icon="ads_click"
                          assignedReference={step.targetObject}
                        />

                        <MiniLogicalObjectPicker
                          key={`${step.id}-animated-object`}
                          procedural={procedural}
                          role="animated"
                          title="Add Animated Object"
                          icon="animation"
                          assignedReference={procedural.activeAnimatedEntry?.object}
                        />

                        <ProceduralAnimatedObjectList
                          entries={procedural.activeAnimatedEntries}
                          activeEntryId={procedural.activeAnimatedEntryId}
                          onSelect={procedural.selectAnimatedEntry}
                          onRemove={procedural.removeAnimatedEntry}
                        />
                      </>
                    )}

                    <p className="text-[10px] leading-4 text-contrast-grayout">
                      {isAssembly
                        ? "Select the component that the learner must drag. Save its loose start position, then move it with the gizmo and save the installed target position."
                        : "Choose one click target, then add one or more animated objects. Clicking the target in Player moves every assigned object together."}
                    </p>
                  </div>

                  <div>
                    <span className="mb-1.5 block text-xs text-contrast-grayout">
                      Gizmo Mode
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["translate", "Move", "open_with"],
                        ["rotate", "Rotate", "360"],
                        ["scale", "Scale", "zoom_out_map"],
                      ].map(([mode, label, icon]) => (
                        <Button
                          key={mode}
                          type="button"
                          size="xs"
                          variant={
                            procedural.transformMode === mode
                              ? "default"
                              : "darkOutline"
                          }
                          onClick={() => procedural.setTransformMode(mode)}
                        >
                          <MaterialIcon name={icon} className="size-4" />
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="darkOutline"
                      disabled={!procedural.activeAnimatedEntry}
                      onClick={procedural.captureStartTransform}
                    >
                      <MaterialIcon name="flag" className="size-4" />
                      Save Start
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="darkOutline"
                      disabled={!procedural.activeAnimatedEntry}
                      onClick={procedural.captureEndTransform}
                    >
                      <MaterialIcon name="sports_score" className="size-4" />
                      {isAssembly ? "Save Target" : "Save End"}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-secondary-default/50 bg-primary/40 p-3 text-[10px] leading-5 text-contrast-grayout">
                    {isAssembly
                      ? "Workflow: place the component in its loose/start position and save Start. Move/rotate it into the correct installed position and save Target. Use Show Start and Show Target to verify both states."
                      : "Workflow: assign the click target, add every object that should move, select each animated object in the list, then save its Start and End transforms. All assigned objects animate together."}
                  </div>

                  {isAssembly && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="darkOutline"
                        disabled={!step.startTransform}
                        onClick={procedural.showActiveStepStart}
                      >
                        <MaterialIcon name="first_page" className="size-4" />
                        Show Start
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="darkOutline"
                        disabled={!step.endTransform}
                        onClick={procedural.showActiveStepTarget}
                      >
                        <MaterialIcon name="my_location" className="size-4" />
                        Show Target
                      </Button>
                    </div>
                  )}

                  <ProceduralStepSavedStateSection
                    procedural={procedural}
                    step={step}
                  />

                  <div className="space-y-3 rounded-lg border border-secondary-default/50 bg-primary/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-white">Camera POV</p>
                        <p className="mt-1 text-[10px] leading-4 text-contrast-grayout">
                          Player applies this authoring view when the step starts. Assembly steps also lock it during drag.
                        </p>
                      </div>
                      <StatusBadge ready={Boolean(step.cameraView)}>
                        {step.cameraView
                          ? "Saved"
                          : isAssembly
                            ? "Required"
                            : "Optional"}
                      </StatusBadge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="xs"
                        variant={step.cameraView ? "default" : "cyanOutline"}
                        onClick={procedural.captureStepCameraView}
                      >
                        <MaterialIcon name="photo_camera" className="size-4" />
                        {step.cameraView ? "Update Camera" : "Save Camera"}
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="darkOutline"
                        disabled={!step.cameraView}
                        onClick={procedural.showActiveStepCameraView}
                      >
                        <MaterialIcon name="center_focus_strong" className="size-4" />
                        View Camera
                      </Button>
                    </div>

                    {step.cameraView && (
                      <button
                        type="button"
                        onClick={procedural.deleteActiveStepCameraView}
                        className="text-[10px] text-red-300 hover:text-red-200"
                      >
                        Remove saved camera
                      </button>
                    )}
                  </div>

                  {isAssembly ? (
                    <div className="space-y-3 rounded-lg border border-secondary-default/50 bg-primary/40 p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1.5 block text-xs text-contrast-grayout">
                            Snap Distance (% model)
                          </span>
                          <input
                            type="number"
                            min="0.1"
                            max="100"
                            step="0.5"
                            value={Number((step.interaction?.snapDistance || 0.05) * 100).toFixed(1)}
                            onChange={(event) =>
                              procedural.updateStep(step.id, {
                                interaction: {
                                  snapDistance: Number(event.target.value) / 100,
                                },
                              })
                            }
                            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
                          />
                        </label>
                        <div className="block">
                          <span className="mb-1.5 block text-xs text-contrast-grayout">
                            Target Rotation
                          </span>
                          <div className="flex h-10 items-center rounded-lg border border-secondary-default/60 bg-primary px-3 text-xs text-secondary-default">
                            Auto align when snapped
                          </div>
                        </div>
                      </div>

                      {[
                        ["autoSnap", "Auto snap when correct"],
                        ["snapBackOnFail", "Return to start when incorrect"],
                        ["showGhost", "Show transparent target ghost"],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center justify-between gap-3 text-xs text-white">
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            checked={step.interaction?.[key] !== false}
                            onChange={(event) =>
                              procedural.updateStep(step.id, {
                                interaction: { [key]: event.target.checked },
                              })
                            }
                            className="size-4 accent-cyan-400"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-contrast-grayout">
                        Duration (ms)
                      </span>
                      <input
                        type="number"
                        min="100"
                        max="30000"
                        step="100"
                        value={step.action?.duration || 1200}
                        onChange={(event) =>
                          procedural.updateStep(step.id, {
                            action: { duration: Number(event.target.value) },
                          })
                        }
                        className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-contrast-grayout">
                        Extra Spin
                      </span>
                      <input
                        type="number"
                        min="-20"
                        max="20"
                        step="0.25"
                        value={step.action?.spinTurns || 0}
                        onChange={(event) =>
                          procedural.updateStep(step.id, {
                            action: { spinTurns: Number(event.target.value) },
                          })
                        }
                        className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs text-contrast-grayout">
                      Spin Axis
                    </span>
                    <select
                      value={step.action?.spinAxis || "z"}
                      onChange={(event) =>
                        procedural.updateStep(step.id, {
                          action: { spinAxis: event.target.value },
                        })
                      }
                      className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
                    >
                      <option value="x">Local X</option>
                      <option value="y">Local Y</option>
                      <option value="z">Local Z</option>
                    </select>
                  </label>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="cyanOutline"
                      disabled={!stepReady || procedural.isPreviewing}
                      onClick={procedural.previewActiveStep}
                    >
                      <MaterialIcon name="play_arrow" className="size-4" />
                      {procedural.isPreviewing
                        ? "Playing..."
                        : isAssembly
                          ? "Preview Install"
                          : "Preview Step"}
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="darkOutline"
                      disabled={!step.startTransform}
                      onClick={procedural.resetActiveStep}
                    >
                      <MaterialIcon name="restart_alt" className="size-4" />
                      Reset Step
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-divider-main pt-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={stepIndex <= 0}
                        onClick={() => procedural.moveStep(step.id, -1)}
                        className="grid size-8 place-items-center rounded-lg border border-secondary-default/50 text-secondary-default disabled:opacity-30"
                        title="Move step up"
                      >
                        <MaterialIcon name="arrow_upward" className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={stepIndex >= procedure.steps.length - 1}
                        onClick={() => procedural.moveStep(step.id, 1)}
                        className="grid size-8 place-items-center rounded-lg border border-secondary-default/50 text-secondary-default disabled:opacity-30"
                        title="Move step down"
                      >
                        <MaterialIcon name="arrow_downward" className="size-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => procedural.deleteStep(step.id)}
                      className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200"
                    >
                      <MaterialIcon name="delete" className="size-4" />
                      Delete Step
                    </button>
                  </div>
                </div>
              </Section>
            )}

            <Section title="Player Result" step="5">
              <div className="space-y-2 text-xs leading-5 text-contrast-grayout">
                {isAssembly ? (
                  <>
                    <p>Assembly steps run sequentially in Player.</p>
                    <p>The active component is highlighted and can be dragged.</p>
                    <p>A transparent ghost shows the correct installation target.</p>
                    <p>Each step restores the saved authoring POV and locks the camera.</p>
                    <p>Correct placement snaps into position and unlocks the next step.</p>
                  </>
                ) : (
                  <>
                    <p>Steps run sequentially in Player.</p>
                    <p>The current click target is highlighted and only that object is accepted.</p>
                    <p>The configured animated object then moves, rotates, and scales.</p>
                    <p>After the animation finishes, the next click target becomes active.</p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => procedural.deleteProcedure(procedure.id)}
                className="mt-4 flex items-center gap-2 text-xs text-red-300 hover:text-red-200"
              >
                <MaterialIcon name="delete_forever" className="size-5" />
                Delete Procedure Material
              </button>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
