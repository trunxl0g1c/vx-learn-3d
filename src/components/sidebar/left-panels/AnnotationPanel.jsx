export default function AnnotationPanel() {
  return (
    <div className="flex h-full flex-col text-white backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex h-16 items-center border-b border-divider-main bg-dark-alpha/70 px-4 text-lg font-semibold backdrop-blur-xl">
        Annotation
      </div>

      <div className="m-3 rounded-2xl border border-divider-main bg-dark-alpha/55 p-4 text-white backdrop-blur-xl">
        Marker mode ada di toolbar bawah. Pilih Bab terlebih dahulu, lalu
        aktifkan Marker untuk menambahkan annotation ke Bab aktif.
      </div>
    </div>
  );
}
