import { HandFist } from "lucide-react";
import { useGameContext } from "./GameContext";

export function Punchouts() {
  const { punchoutsRemaining } = useGameContext();

  return (
    <div className="rounded-[1.25rem] border border-emerald-400/20 bg-emerald-400/8 px-3 py-3">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-emerald-200/80">
        Punchouts
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: punchoutsRemaining }).map((_, idx) => (
          <span
            key={idx}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/35 bg-emerald-300/10 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.14)]"
            aria-hidden="true"
          >
            <HandFist className="h-4 w-4" aria-hidden="true" />
          </span>
        ))}
        {punchoutsRemaining === 0 ? (
          <span className="text-sm font-semibold text-emerald-50/80">Spent</span>
        ) : null}
      </div>
    </div>
  );
}
