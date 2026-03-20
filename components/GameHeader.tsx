import Link from "next/link";
import { useMemo } from "react";
import { useGameContext } from "./GameContext";
import { RulesChip } from "./RulesChip";

export function GameHeader() {
  const { dateKey } = useGameContext();
  const userTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  return (
    <header className="game-header-panel rounded-[1.75rem] px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.36em] text-cyan-200/75">
            Gridlock Daily
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              Arcade Board
            </h1>
            <p className="pb-1 text-sm text-slate-300">
              Shared puzzle. Live board feel.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-slate-100">
            Board {dateKey || "-"}
          </p>
          <RulesChip />
          <Link
            href={{
              pathname: "/leaderboard",
              query: { timeZone: userTimeZone }
            }}
            className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/12 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-300/18"
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </header>
  );
}
