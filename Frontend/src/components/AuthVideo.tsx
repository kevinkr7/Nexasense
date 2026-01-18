import { useEffect, useMemo, useRef, useState } from "react";

type Theme = "light" | "dark";
type Direction = "forward" | "backward";

const FADE_WINDOW = 0.6; // seconds before end to start fading

const resolveInitialTheme = (): Theme => {
  const stored = localStorage.getItem("nexasense_theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const AuthVideo = ({ className }: { className?: string }) => {
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);

  const [theme, setTheme] = useState<Theme | null>(null);
  const [direction, setDirection] = useState<Direction>("forward");
  const [active, setActive] = useState<"A" | "B">("A");
  const [fading, setFading] = useState(false);

  /* ---------------- Theme sync ---------------- */
  useEffect(() => {
    setTheme(resolveInitialTheme());

    const obs = new MutationObserver(() => {
      setTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
    });

    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => obs.disconnect();
  }, []);

  const resolveSrc = (dir: Direction) => {
    if (!theme) return "";
    return theme === "dark"
      ? `/resources/ambient-dark-${dir}.mp4`
      : `/resources/ambient-light-${dir}.mp4`;
  };

  /* ---------------- Playback engine ---------------- */
  useEffect(() => {
    if (!theme) return;

    const current = active === "A" ? videoA.current : videoB.current;
    const next = active === "A" ? videoB.current : videoA.current;
    if (!current || !next) return;

    const nextDirection: Direction =
      direction === "forward" ? "backward" : "forward";

    // Preload next video
    next.src = resolveSrc(nextDirection);
    next.currentTime = 0;
    next.pause();

    let fadeStarted = false;

    const onTimeUpdate = () => {
      if (
        !fadeStarted &&
        current.duration &&
        current.currentTime >= current.duration - FADE_WINDOW
      ) {
        fadeStarted = true;
        setFading(true);
        next.play().catch(() => undefined);
      }
    };

    const onEnded = () => {
      setActive((p) => (p === "A" ? "B" : "A"));
      setDirection(nextDirection);
      setFading(false);
    };

    current.addEventListener("timeupdate", onTimeUpdate);
    current.addEventListener("ended", onEnded);

    current.play().catch(() => undefined);

    return () => {
      current.removeEventListener("timeupdate", onTimeUpdate);
      current.removeEventListener("ended", onEnded);
    };
  }, [theme, direction, active]);

  if (!theme) return <div className={`h-full w-full ${className ?? ""}`} />;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className ?? ""}`}>
      {/* Video A */}
      <video
        ref={videoA}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          active === "A" && !fading ? "opacity-100" : "opacity-0"
        }`}
        src={resolveSrc(direction)}
        muted
        playsInline
        preload="auto"
      />

      {/* Video B */}
      <video
        ref={videoB}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          active === "B" || fading ? "opacity-100" : "opacity-0"
        }`}
        muted
        playsInline
        preload="auto"
      />

      {/* Right-edge blend */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-28 bg-gradient-to-l from-background via-background/60 to-transparent" />
    </div>
  );
};
