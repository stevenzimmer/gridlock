import { PlayerId } from "./PlayerId";
import { useGameContext } from "./GameContext";

export function PlayerPanel() {
  const { playerDisplayName, hasUsername } = useGameContext();

  return (
    <section className="game-side-panel rounded-[1.5rem] p-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-fuchsia-200/80">
        Player
      </p>
      {hasUsername ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Handle</p>
          <p className="mt-1 break-all text-lg font-bold lowercase text-white">
            {playerDisplayName || "-"}
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
          <PlayerId />
        </div>
      )}
    </section>
  );
}
