# Engine Migration Notes

## Sprint 17

- `src/engine` is now the canonical location for reusable VXplore logic.
- `src/core` remains only as a compatibility layer and re-exports from `src/engine`.
- `PlayerPage.jsx` now imports project/model/selection helpers from `src/engine`.

## Next rule

Do not add new feature logic to `src/core`. Add it to `src/engine` instead.
