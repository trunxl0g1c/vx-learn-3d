import { useEffect, useRef } from "react";

export default function PlayerIOSWebARBackground({ stream = null }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    video.srcObject = stream || null;
    if (stream) {
      const playback = video.play?.();
      playback?.catch?.(() => {
        // iOS may defer playback until its camera stream becomes ready.
      });
    }

    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
    />
  );
}
