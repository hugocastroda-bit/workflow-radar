import { useState, useRef, useCallback } from "react";

const THRESHOLD = 50;   // px para activar refresh
const MAX_PULL  = 80;   // px máximo de arrastre visual
const FRICTION  = 2.5;  // resistencia elástica

export default function PullToRefresh({ onRefresh, children }) {
  const [state, setState]   = useState("idle");   // idle | pulling | refreshing | completed
  const [pullY, setPullY]   = useState(0);
  const startYRef           = useRef(null);
  const pullingRef          = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY !== 0) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pullingRef.current || startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) { setPullY(0); setState("idle"); return; }
    const dampened = Math.min(delta / FRICTION, MAX_PULL);
    setPullY(dampened);
    setState(dampened >= THRESHOLD ? "pulling" : "pulling");
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    startYRef.current  = null;

    if (pullY >= THRESHOLD) {
      setState("refreshing");
      setPullY(THRESHOLD);
      try { await onRefresh?.(); } catch (_) {}
      setState("completed");
      setTimeout(() => { setState("idle"); setPullY(0); }, 400);
    } else {
      setState("idle");
      setPullY(0);
    }
  }, [pullY, onRefresh]);

  const isRefreshing  = state === "refreshing";
  const progress      = Math.min(pullY / THRESHOLD, 1);
  const indicatorH    = isRefreshing ? THRESHOLD : pullY;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full"
    >
      {/* Indicador pull-to-refresh */}
      <div
        className="overflow-hidden flex items-center justify-center transition-all duration-300"
        style={{ height: indicatorH }}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200
            bg-white dark:bg-[#2C2C2E]
            ${progress > 0 || isRefreshing ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
          style={{ opacity: isRefreshing ? 1 : progress }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0066CC"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-5 h-5 transition-transform duration-300 dark:stroke-white ${isRefreshing ? "animate-spin" : ""}`}
            style={{ transform: !isRefreshing ? `rotate(${progress * 180}deg)` : undefined }}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </div>
      </div>

      {children}
    </div>
  );
}