import { RulesChip } from "./RulesChip";

export function HUD() {
  return (
    <section className="space-y-4">
      <div className="game-side-panel rounded-[1.5rem] p-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-cyan-200/80">
          Quick Guide
        </p>
        <div className="mt-3 space-y-3 text-sm text-slate-200">
          <p>Drag across one row to build a word. Valid previews light up before you submit.</p>
          <p>Rotate when lanes dry up. Punch out blockers only when the board shape justifies it.</p>
          <p>Misses are limited, so favor reliable clears over risky long shots.</p>
        </div>
        <div className="mt-4">
          <RulesChip />
        </div>
      </div>

      <div className="game-side-panel rounded-[1.5rem] p-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-amber-200/80">
          Design Notes
        </p>
        <div className="mt-3 space-y-3 text-sm text-slate-300">
          <p>The board is the main surface. Stats and utility stay compact so your eye returns to the grid fast.</p>
          <p>Core actions live near the board, while rules and identity are available without overwhelming the play area.</p>
        </div>
      </div>
    </section>
  );
}
