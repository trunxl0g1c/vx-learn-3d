import { useEffect, useState } from "react";

function readViewport() {
  if (typeof window === "undefined") {
    return {
      width: 1440,
      height: 900,
      isMobile: false,
      isTablet: false,
      isCompact: false,
      isPortrait: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isCompact: width < 1440,
    isPortrait: height > width,
  };
}

export default function useResponsiveViewport() {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    let frameId = 0;

    const updateViewport = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setViewport(readViewport());
      });
    };

    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  return viewport;
}
