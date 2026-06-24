# Refactor Stage 19

## Fokus
Tahap ini melanjutkan hasil Tahap 18 dengan merapikan `modules/player/PlayerPage.jsx`.

## Perubahan utama
- Tambah folder `components/player/`
- Pecah beberapa bagian Player menjadi komponen:
  - `PlayerSceneCanvas.jsx`
  - `PlayerChapterInfoPanel.jsx`
  - `PlayerToolsMenu.jsx`
  - `PlayerCutSlider.jsx`
  - `PlayerChapterListPanel.jsx`
  - `PlayerBottomToolbar.jsx`
- `PlayerPage.jsx` turun dari ±1196 baris menjadi ±634 baris.
- Reuse tetap menggunakan komponen viewer yang sudah ada:
  - `LoadingModel`
  - `CameraAnimator`
- Relative import check: OK.

## Catatan
Belum dilakukan `npm run build` karena paket yang dikirim hanya folder `src`, tidak termasuk `package.json`.
Setelah dicopy ke project utama, jalankan:

```bash
npm run dev
```

atau

```bash
pnpm dev
```

Jika aman, tahap berikutnya bisa fokus memecah sisa logic Player menjadi hooks.
