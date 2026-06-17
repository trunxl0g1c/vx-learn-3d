# Dokumentasi Proyek my-3d-app

## Ikhtisar
`my-3d-app` adalah aplikasi React berbasis Vite yang menyediakan pengalaman interaktif untuk memuat, mengeksplorasi, dan membuat materi 3D. Aplikasi ini memiliki tiga mode utama:

- `Viewer`: menampilkan model 3D, menandai objek, dan melakukan visualisasi cutaway / x-ray.
- `Editor`: membuat dan menyimpan file JSON materi 3D dengan bab dan deskripsi.
- `Player`: memuat file JSON materi dan menavigasi bab sambil menampilkan model dan marker.

## Teknologi Utama

- React 19
- Vite
- React Router DOM
- Three.js
- @react-three/fiber
- @react-three/drei
- @react-three/postprocessing
- ESLint

## Struktur Folder

- `src/`
  - `App.jsx` - routing aplikasi.
  - `ViewerPage.jsx` - antarmuka utama untuk eksplorasi model 3D dan pembuatan materi.
  - `main.jsx` - entry React.
  - `components/`
    - `LeftPanel.jsx` - panel kiri dengan toolbar.
    - `RightPanel.jsx` - tree object dan daftar marker.
    - `Toolbar.jsx` - kontrol model, marker, x-ray, cutaway, dan fungsi reset.
    - `Model.jsx` - pemuat model GLB dan logika klik untuk marker / pemilihan objek.
    - `Marker.jsx` - visualisasi titik marker di scene.
  - `modules/`
    - `editor/EditorPage.jsx` - halaman editor materi JSON.
    - `player/PlayerPage.jsx` - halaman player untuk memuat dan memutar materi.
    - `material/`
      - `defaultMaterial.js` - template awal data materi.
      - `materialUtils.js` - pembuatan bab dan unduhan JSON.
  - `utils/`
    - `cutAwayUtils.js` - logika clipping plane cutaway.
    - `markerUtils.js` - simpan dan muat daftar marker.

- `public/models/models.json` - daftar model 3D default.

## Cara Menjalankan

1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Jalankan server development:
   ```bash
   npm run dev
   ```
3. Buka browser ke alamat yang ditampilkan oleh Vite.

## Script NPM

- `npm run dev` - jalankan Vite development server.
- `npm run build` - buat bundel untuk produksi.
- `npm run preview` - jalankan preview build produksi.
- `npm run lint` - jalankan ESLint pada seluruh proyek.

## Halaman dan Fitur

### ViewerPage

`ViewerPage.jsx` adalah halaman utama yang menampilkan 3D canvas dan kontrol.

Fitur utama:
- Memuat model GLB dari `public/models/models.json` atau file upload `.glb`.
- Menambahkan marker dengan `markerMode` aktif.
- Menyimpan marker sebagai `markers.json`.
- Memuat marker dari file `.json`.
- Memilih objek 3D dari daftar struktur objek.
- X-ray mode: menyorot objek terpilih dan membuat objek lain tembus pandang.
- Cutaway: memotong model menggunakan clipping plane pada sumbu X.
- Pull apart / reset part: pisahkan objek mesh lalu kembalikan ke posisi semula.
- Transform controls untuk memindahkan objek yang dipilih.
- Membuat bab materi dari object terpilih.
- Menyimpan materi sebagai file JSON.

### EditorPage

`EditorPage.jsx` adalah halaman yang digunakan untuk membuat struktur materi 3D secara manual.

Fitur utama:
- Mengatur judul materi.
- Menentukan `modelUrl` untuk file GLB.
- Menambahkan bab baru.
- Mengisi judul dan deskripsi bab.
- Mengunduh data materi sebagai JSON.
- Menampilkan preview JSON di bawah form.

### PlayerPage

`PlayerPage.jsx` memuat file JSON materi dan memperlihatkan model 3D beserta bab.

Fitur utama:
- Mengunggah file JSON materi.
- Menampilkan judul materi dan model path.
- Menampilkan daftar bab yang dapat dipilih.
- Fokus kamera ke posisi bab saat bab dipilih.
- Menampilkan deskripsi bab di panel overlay.
- Memuat marker yang disimpan dalam JSON.

## Komponen Kunci

### `Model.jsx`
- Menggunakan `useGLTF` dari `@react-three/drei` untuk memuat file GLB.
- Mendaftarkan callback `onModelLoaded` setelah scene model tersedia.
- Menangani klik objek untuk menambahkan marker atau memilih objek.
- Menjalankan animasi interpolasi posisi untuk fitur pull apart dan reset.

### `Marker.jsx`
- Menampilkan bola merah kecil pada posisi marker.
- Menampilkan label HTML di dekat marker.

### `Toolbar.jsx`
- Menyediakan kontrol untuk:
  - memilih model default,
  - upload GLB,
  - aktifkan/ nonaktifkan marker mode,
  - simpan marker,
  - load marker,
  - pull apart dan reset part,
  - reset x-ray,
  - toggle cutaway dan kontrol posisi cut plane.

### `LeftPanel.jsx`
- Panel navigasi kiri yang menampung `Toolbar`.

### `RightPanel.jsx`
- Menampilkan tree hierarki objek model.
- Mendukung ekspansi / kollaps pada level tree.
- Menampilkan daftar marker yang terpasang.

## Utilitas

### `cutAwayUtils.js`
- Fungsi `applyCutAway(modelScene, enabled, value)`
- Menggunakan `THREE.Plane` untuk mengatur `clippingPlanes` pada setiap mesh.

### `markerUtils.js`
- `saveMarkersToFile(markers)` untuk mengunduh JSON marker.
- `processLoadedMarkers(json)` untuk memastikan posisi marker menjadi array `[x,y,z]`.

### `defaultMaterial.js`
- `createDefaultMaterial()` menghasilkan template awal materi dengan `id`, `title`, `modelUrl`, dan `chapters`.

### `materialUtils.js`
- `createChapter(chapterNumber)` membuat bab baru dengan struktur default.
- `downloadMaterialJson(material)` mengunduh materi sebagai file JSON.

## Format Data Materi

Material JSON memiliki struktur umum:

```json
{
  "id": "...",
  "title": "Materi 3D Baru",
  "modelUrl": "...",
  "chapters": [
    {
      "id": "...",
      "title": "Bab 1",
      "description": "...",
      "cameraPosition": [x, y, z],
      "cameraTarget": [x, y, z],
      "callouts": [],
      "objectName": "..."
    }
  ],
  "markers": [
    {
      "position": [x, y, z],
      "text": "Nama bagian"
    }
  ]
}
```

## Alur Penggunaan

1. Jalankan `npm run dev`.
2. Buka `/` untuk Viewer.
3. Pilih model default atau upload `.glb`.
4. Aktifkan `Set Marker` untuk membuat marker.
5. Gunakan object tree di panel kanan untuk memilih dan menyorot bagian.
6. Gunakan tombol `Cut On`, `Pull Apart`, dan `Reset` untuk eksplorasi model.
7. Buat bab materi dari object terpilih dan simpan JSON.
8. Buka `/player` untuk memuat JSON materi dan menavigasi bab.

## Catatan Pengembangan

- Routing dibuat di `App.jsx` dengan `react-router-dom`.
- Viewer menerima model GLB lewat `modelUrl` dan menampilkan dengan `@react-three/fiber`.
- Fitur `TransformControls` aktif saat objek terpilih.
- X-ray menghasilkan material transparan pada objek non-terpilih.
- `RightPanel` mengatur kedalaman tree dengan `treeDepth`.

## Rekomendasi Perbaikan

- Tambahkan validasi file `GLB` dan JSON untuk keamanan.
- Tambahkan `Snackbar` atau notifikasi untuk aksi berhasil/gagal.
- Pisahkan logika besar di `ViewerPage.jsx` menjadi hook dan utilitas terpisah.
- Tambahkan `type` validasi atau migrasikan ke TypeScript.
- Tambahkan pengujian unit untuk utilitas marker dan cutaway.
