# VXplore Engine Registry

`createVXEngine()` adalah entry point untuk membuat satu set engine yang saling terhubung:

- `engine.model`
- `engine.selection`
- `engine.camera`
- `engine.cut`

Tujuan registry ini adalah mencegah Editor, Player, Viewer, VR, dan AR membuat engine satu per satu dengan konfigurasi yang berbeda.

Contoh:

```js
import { createVXEngine } from "../engine"

const engine = createVXEngine({
  model: {
    buildObjectTree,
  },
})

const modelState = engine.initializeModel(scene, viewerSettings)

engine.selection.selectObject(mesh)
engine.camera.focusObject(mesh)
engine.cut.enable()
```

Untuk sementara registry ini belum wajib dipakai semua halaman. Ia disiapkan sebagai fondasi migrasi berikutnya.
