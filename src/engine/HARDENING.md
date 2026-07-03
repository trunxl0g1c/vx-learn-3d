# VXEngine Hardening Notes

This checkpoint standardizes lifecycle APIs across VXEngine modules.

## Lifecycle contract

Every engine should expose these methods when relevant:

- `getState()` returns serializable/runtime state useful for debugging.
- `reset()` or `resetState()` clears runtime state without touching the UI.
- `dispose()` releases references owned by the engine.

## Current lifecycle entry points

Use the registry-level API when possible:

```js
const engine = createVXEngine()

engine.initializeModel(scene, viewerSettings)
engine.clearScene(scene)
engine.reset()
engine.dispose()
```

## Layering rule

UI components should not manipulate Three.js objects directly unless they are renderer components.
Prefer this flow:

```txt
UI → Feature Hook / Manager → VXEngine → Three.js
```

## Compatibility note

Legacy hooks and managers are still allowed to exist while migration is in progress.
New business logic should be added to `src/engine` first, then exposed through hooks/managers.
