import { useEffect, useRef } from "react";
import { CircleX } from "lucide-react";
import { MAX_INVALID_SUBMISSIONS } from "@/lib/config";
import { useGameContext } from "./GameContext";

export function SubmissionsRemaining() {
  const { invalidWordsSubmitted, invalidImpactNonce } = useGameContext();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const invalidSubmissionsRemaining = Math.max(0, MAX_INVALID_SUBMISSIONS - invalidWordsSubmitted);

  useEffect(() => {
    if (!invalidImpactNonce || !panelRef.current) {
      return;
    }
    const animation = panelRef.current.animate(
      [
        { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(248,113,113,0)" },
        { transform: "scale(1.04)", boxShadow: "0 0 0 2px rgba(248,113,113,0.6)" },
        { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(248,113,113,0)" }
      ],
      {
        duration: 250,
        easing: "ease-out"
      }
    );
    return () => {
      animation.cancel();
    };
  }, [invalidImpactNonce]);

  return (
    <div
      ref={panelRef}
      className="rounded-[1.25rem] border border-rose-400/20 bg-rose-400/8 px-3 py-3"
    >
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-rose-200/80">
        Misses Left
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: invalidSubmissionsRemaining }).map((_, idx) => (
          <span
            key={idx}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-300/40 bg-rose-300/12 text-rose-50"
            aria-hidden="true"
          >
            <CircleX className="h-4 w-4" aria-hidden="true" />
          </span>
        ))}
        {invalidSubmissionsRemaining === 0 ? (
          <span className="text-sm font-semibold text-rose-50/80">Locked</span>
        ) : null}
      </div>
    </div>
  );
}
