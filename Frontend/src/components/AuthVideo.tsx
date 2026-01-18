import { useEffect, useMemo, useRef, useState } from "react";

type AuthVideoProps = {
  className?: string;
};

const getIsDarkTheme = () =>
  document.documentElement.classList.contains("dark");

export const AuthVideo = ({ className }: AuthVideoProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isDark, setIsDark] = useState(getIsDarkTheme());
  const [isReversing, setIsReversing] = useState(false);

  const videoSource = useMemo(
    () =>
      isDark
        ? "/resources/ambient-study-dark.mp4"
        : "/resources/ambient-study-light.mp4",
    [isDark]
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(getIsDarkTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setIsReversing(false);
    const handleLoaded = () => {
      video.play().catch(() => undefined);
    };
    video.addEventListener("loadeddata", handleLoaded);
    return () => video.removeEventListener("loadeddata", handleLoaded);
  }, [videoSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let rafId: number | null = null;
    let lastTime: number | null = null;

    const stepReverse = (timestamp: number) => {
      if (!lastTime) {
        lastTime = timestamp;
      }
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      video.currentTime = Math.max(0, video.currentTime - delta);
      if (video.currentTime <= 0.05) {
        setIsReversing(false);
        lastTime = null;
        video.currentTime = 0;
        video.play().catch(() => undefined);
        return;
      }
      rafId = requestAnimationFrame(stepReverse);
    };

    const handleEnded = () => {
      setIsReversing(true);
    };

    if (isReversing) {
      video.pause();
      video.playbackRate = 1;
      rafId = requestAnimationFrame(stepReverse);
    } else {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      video.playbackRate = 1;
      video.play().catch(() => undefined);
    }

    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("ended", handleEnded);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isReversing, videoSource]);

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src={videoSource}
        autoPlay
        muted
        playsInline
        preload="none"
      />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-28 bg-gradient-to-l from-background via-background/40 to-transparent" />
    </div>
  );
};
