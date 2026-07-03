# VXplore Engine

This folder is the target home for VXplore reusable application logic.

## Rule

New shared 3D/business logic should go into `src/engine`, not `src/core`.

`src/core` is kept temporarily as a compatibility layer during migration, so old imports can continue to work while modules move gradually into the engine.

## Current migrated domains

- `engine/project`
- `engine/model`
- `engine/selection`
