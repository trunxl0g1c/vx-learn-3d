// import { Play } from "lucide-react";
// import Button from "../../ui/button";
// import Checkbox from "../../ui/checkbox";

// export default function AnimationTab(props) {
//   const {
//     selectedObjectName,
//     createChapterFromSelectedObject,
//     saveCameraViewToActiveChapter,
//     saveMaterial,
//     applyShaderMode,
//     shaderMode,
//     metalness,
//     setMetalness,
//     roughness,
//     setRoughness,
//     viewerSettings,
//     setViewerSettings,
//     updateEnvIntensity,
//     material,
//     activeChapterId,
//     setActiveChapterId,
//     panelSectionStyle,
//     inputStyle,
//     mediaButtonStyle,
//     updateChapterField,
//     addChapterParameter,
//     updateChapterParameter,
//     deleteChapterParameter,
//     deleteMarkerFromActiveChapter,
//     animations,
//     selectedAnimations,
//     setSelectedAnimations,
//     setAnimationCommand,
//     isChapterAnimationSelected,
//     getChapterAnimationConfig,
//     toggleChapterAnimation,
//     updateChapterAnimationField,
//     playAnimationPreview,
//     stopAnimationPreview,
//     addChapterMedia,
//     deleteChapterMedia,
//   } = props;

//   return (
//     <div className="flex flex-col gap-1 p-3">
//       <div className="bg-dark-alpha p-3 rounded-2xl mb-3">
//         <h3 className="font-bold text-base mb-3">Advanced Animations</h3>

//         {animations.length === 0 ? (
//           <div
//             style={{
//               fontSize: 12,
//               color: "#9ca3af",
//             }}
//           >
//             No animations available for this model
//           </div>
//         ) : (
//           <>
//             <div className="flex gap-3 mb-4 w-full items-center justify-center">
//               <Button
//                 size="sm"
//                 onClick={() => {
//                   const next = {};

//                   animations.forEach((anim) => {
//                     next[anim.name] = {
//                       ...(selectedAnimations[anim.name] || {}),
//                       selected: true,
//                     };
//                   });

//                   setSelectedAnimations(next);
//                 }}
//                 className="w-1/2"
//               >
//                 Select All
//               </Button>

//               <Button
//                 size="sm"
//                 onClick={() => {
//                   const next = {};

//                   animations.forEach((anim) => {
//                     next[anim.name] = {
//                       ...(selectedAnimations[anim.name] || {}),
//                       selected: false,
//                     };
//                   });

//                   setSelectedAnimations(next);
//                 }}
//                 className="w-1/2"
//               >
//                 Clear
//               </Button>
//             </div>

//             <div className="sidebar-scroll mb-3 max-h-[180px] overflow-y-auto rounded-lg border border-divider-main">
//               {animations.map((anim) => {
//                 const config = selectedAnimations[anim.name] || {
//                   selected: false,
//                   loop: false,
//                 };

//                 return (
//                   <div
//                     key={anim.name}
//                     className="grid grid-cols-[24px_1fr_70px] items-center gap-2 border-b border-divider-main p-2 last:border-b-0"
//                   >
//                     <Checkbox
//                       checked={config.selected}
//                       onCheckedChange={(checked) => {
//                         setSelectedAnimations((prev) => ({
//                           ...prev,
//                           [anim.name]: {
//                             ...(prev[anim.name] || {}),
//                             selected: checked,
//                           },
//                         }));
//                       }}
//                     />

//                     <div>
//                       <div className="text-sm font-bold text-white">
//                         {anim.name}
//                       </div>
//                       <div className="text-[11px] text-contrast-grayout">
//                         {anim.duration?.toFixed?.(2) || 0}s
//                       </div>
//                     </div>

//                     <Checkbox
//                       label="Loop"
//                       checked={config.loop}
//                       onCheckedChange={(checked) => {
//                         setSelectedAnimations((prev) => ({
//                           ...prev,
//                           [anim.name]: {
//                             ...(prev[anim.name] || {}),
//                             loop: checked,
//                           },
//                         }));
//                       }}
//                       labelClassName="text-[11px] text-white"
//                     />
//                   </div>
//                 );
//               })}
//             </div>

//             <div className="flex gap-2">
//               <Button
//                 size="sm"
//                 className="flex-1"
//                 onClick={() => {
//                   const selected = {};

//                   animations.forEach((anim) => {
//                     const config = selectedAnimations?.[anim.name];

//                     if (config?.selected) {
//                       selected[anim.name] = {
//                         selected: true,
//                         loop: Boolean(config.loop),
//                       };
//                     }
//                   });

//                   if (Object.keys(selected).length === 0) {
//                     alert("Please select at least one animation.");
//                     return;
//                   }

//                   setAnimationCommand(null);

//                   setTimeout(() => {
//                     setAnimationCommand({
//                       type: "play",
//                       selectedAnimations: selected,
//                       id: crypto.randomUUID(),
//                     });
//                   }, 10);
//                 }}
//               >
//                 <Play className="size-4" />
//                 Play Selected
//               </Button>

//               <Button
//                 size="sm"
//                 onClick={() => {
//                   setAnimationCommand({
//                     type: "stop",
//                     id: crypto.randomUUID(),
//                   });
//                 }}
//               >
//                 Stop
//               </Button>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

import Button from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";

export default function AnimationTab(props) {
  const { animations = [], setAnimationCommand } = props;

  const playSingleAnimation = (anim) => {
    setAnimationCommand(null);

    setTimeout(() => {
      setAnimationCommand({
        type: "play",
        selectedAnimations: {
          [anim.name]: {
            selected: true,
            loop: false,
          },
        },
        id: crypto.randomUUID(),
      });
    }, 10);
  };

  const stopAnimation = () => {
    setAnimationCommand({
      type: "stop",
      id: crypto.randomUUID(),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center bg-dark-alpha px-4 text-lg font-normal">
        Animation
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {animations.length === 0 ? (
          <div className="rounded-2xl border border-divider-main bg-dark-alpha p-4 text-sm text-contrast-grayout">
            No animations available for this model.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {animations.map((anim, index) => (
              <button
                key={anim.name || index}
                type="button"
                onClick={() => playSingleAnimation(anim)}
                className="flex min-h-15 w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-contrast-grayout bg-dark-alpha px-4 text-left transition hover:border-secondary-default hover:bg-primary/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-normal text-white">
                    {anim.name || `Animation Name ${index + 1}`}
                  </div>

                  <div className="mt-1 text-xs text-grayout-main">
                    {anim.duration?.toFixed?.(2) || 0}s
                  </div>
                </div>

                <MaterialIcon
                  name="play_arrow"
                  fill
                  className="size-8 shrink-0 text-secondary-default"
                />
              </button>
            ))}
          </div>
        )}

        {animations.length > 0 && (
          <Button
            size="sm"
            variant="default"
            onClick={stopAnimation}
            className="mt-4 w-full"
          >
            Stop Animation
          </Button>
        )}
      </div>
    </div>
  );
}
