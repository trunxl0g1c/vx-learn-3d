# VXplore Player V2

Player V2 is a safe parallel implementation path for the next-generation VXplore Player.

## Current milestone

### Milestone 3 — Project Loading + Basic Model Render + Chapter Navigation + Object Selection

Implemented through Sprint 24:

- Player V2 no longer reuses the legacy Player controller.
- Player V2 has its own `usePlayerV2Project` hook.
- Player V2 loads projects from IndexedDB through `engine/project/useProjectLoader`.
- Player V2 renders the GLB using the existing stable `PlayerSceneCanvas`.
- Player V2 displays the chapter list and active chapter info panel.
- Selecting a chapter highlights its object and applies saved chapter camera target/model rotation when available.
- Clicking an object can activate the matching chapter when a chapter object name matches the selected object or its parent.
- Player V2 has an isolated `usePlayerV2Selection` hook.
- Selected object information is displayed in a lightweight selection info panel.
- Selection can be cleared without touching chapter/project state.
- Legacy Player remains unchanged at `/vxplore/player/:projectId`.
- Player V2 remains isolated at `/vxplore/player-v2/:projectId`.

## Not implemented yet

- Free play tools
- Cut slider
- Chapter animation playback
- Full Player toolbar

These will be added feature by feature.
