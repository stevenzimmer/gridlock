import {useGameContext} from "./GameContext";
export function GameOverlay() {
    const {score, level, wordsCleared, longestWord} = useGameContext();
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-950/35 px-4"
        >
            <div className="w-full max-w-md rounded-lg border-4 border-slate-200/80 bg-slate-800/90 px-4 py-4 text-slate-100 shadow-2xl">
                <div className="game-over-stamp mb-3 text-center text-3xl font-black uppercase tracking-[0.2em] sm:text-5xl py-12">
                    Grid lock!
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm font-semibold sm:text-lg">
                    <div className="rounded-md border border-slate-300/30 bg-slate-950/40 px-3 py-2">
                        Score: {score}
                    </div>
                    <div className="rounded-md border border-slate-300/30 bg-slate-950/40 px-3 py-2">
                        Level: {level}
                    </div>
                    <div className="rounded-md border border-slate-300/30 bg-slate-950/40 px-3 py-2">
                        Words: {wordsCleared}
                    </div>
                    <div className="rounded-md border border-slate-300/30 bg-slate-950/40 px-3 py-2">
                        Longest: {longestWord || "-"}
                    </div>
                </div>
            </div>
        </div>
    );
}
