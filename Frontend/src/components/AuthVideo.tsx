import { useEffect, useMemo, useRef, useState } from "react";

type AuthVideoProps = {
  className?: string;
};

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const storedTheme = localStorage.getItem("nexasense_theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const AuthVideo = ({ className }: AuthVideoProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme());
  const [isReversing, setIsReversing] = useState(false);

  const videoSource = useMemo(
    () =>
      theme === "dark"
        ? "/resources/ambient-study-dark.mp4"
        : "/resources/ambient-study-light.mp4",
    [theme]
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const nextTheme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      setTheme(nextTheme);
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
      video.playbackRate = 1;
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
    const epsilon = 0.05;

    const stepReverse = (timestamp: number) => {
      if (!lastTime) {
        lastTime = timestamp;
      }
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      video.currentTime = Math.max(0, video.currentTime - delta);
      if (video.currentTime <= epsilon) {
        setIsReversing(false);
        lastTime = null;
        return;
      }
      rafId = requestAnimationFrame(stepReverse);
    };

    const handleEnded = () => {
      setIsReversing(true);
    };

    const handleTimeUpdate = () => {
      if (!isReversing && video.duration && video.currentTime >= video.duration - epsilon) {
        setIsReversing(true);
      }
    };

    if (isReversing) {
      video.pause();
      video.playbackRate = -1;
      rafId = requestAnimationFrame(stepReverse);
    } else {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      video.playbackRate = 1;
      video.play().catch(() => undefined);
    }

    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
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
