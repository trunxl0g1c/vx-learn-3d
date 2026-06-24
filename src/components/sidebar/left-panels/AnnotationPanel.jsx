export default function AnnotationPanel() {
  return (
    <div className="flex h-full flex-col bg-primary text-white">
      <div className="sticky top-0 z-10 flex h-16 items-center bg-[#14201f] px-4 text-lg font-semibold">
        Annotation
      </div>

      <div className="text-white p-4 m-3 rounded-2xl bg-dark-alpha">
        Marker mode ada di toolbar bawah. Pilih Bab terlebih dahulu, lalu
        aktifkan Marker untuk menambahkan annotation ke Bab aktif.
      </div>
    </div>
  );
}
