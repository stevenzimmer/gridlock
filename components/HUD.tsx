import { MAX_INVALID_SUBMISSIONS } from "@/lib/config";

type HUDProps = {
    playerId: string;
    score: number;
    level: number;
    wordsCleared: number;
    longestWord: string;
    punchoutsRemaining: number;
    invalidWordsSubmitted: number;
    dateKey: string;
    completed: boolean;
    loading: boolean;
    selectedDisplay: string;
    canSubmitSelection: boolean;
    message: string | null;
    onSubmitSelection: () => void;
};

export function HUD({
    playerId,
    score,
    level,
    wordsCleared,
    longestWord,
    punchoutsRemaining,
    invalidWordsSubmitted,
    dateKey,
    completed,
    loading,
    selectedDisplay,
    canSubmitSelection,
    message,
    onSubmitSelection,
}: HUDProps) {
    const invalidSubmissionsRemaining = Math.max(
        0,
        MAX_INVALID_SUBMISSIONS - invalidWordsSubmitted,
    );

    return (
        <header className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl font-black tracking-tight text-cyan-100 sm:text-3xl">
                    Gravity Grid
                </h1>
                <p className="rounded border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
                    Daily board: {dateKey || "-"}
                </p>
            </div>

            <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                    Player ID
                </p>
                <p className="break-all text-sm font-semibold text-slate-100">
                    {playerId || "-"}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Score" value={score.toString()} />
                <Stat label="Level" value={level.toString()} />
                <Stat label="Words" value={wordsCleared.toString()} />
                <Stat label="Longest" value={longestWord || "-"} />
            </div>

            <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
                <p className="text-sm font-semibold text-slate-100">
                    {punchoutsRemaining}{" "}
                    <span className="uppercase tracking-wide text-slate-400">
                        Punchouts
                    </span>{" "}
                    remaining
                </p>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white px-3 py-3">
                <div className="mb-2 flex flex-wrap gap-1">
                    {Array.from({length: invalidSubmissionsRemaining}).map(
                        (_, idx) => (
                            <span
                                key={idx}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-300 bg-red-50 text-sm font-black text-red-700"
                                aria-hidden="true"
                            >
                                x
                            </span>
                        ),
                    )}
                </div>
                <p className="text-sm font-semibold text-slate-800">
                    {invalidSubmissionsRemaining} invalid submissions remaining.
                </p>
            </div>

            <div className="rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm">
                <p className="text-slate-200">
                    Selected:{" "}
                    <span className="font-semibold text-amber-200">
                        {selectedDisplay || "-"}
                    </span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <button
                        type="button"
                        disabled={loading || completed || !canSubmitSelection}
                        onClick={onSubmitSelection}
                        className="rounded border border-amber-300 px-3 py-1 font-medium text-amber-100 enabled:hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {loading ? "Saving..." : "Submit"}
                    </button>
                    <span className="text-xs text-slate-300">
                        {message ??
                            (completed
                                ? "Daily run completed."
                                : "Select 3+ contiguous letters in one row or double-click a letter to punch it out.")}
                    </span>
                </div>
            </div>
        </header>
    );
}

function Stat({label, value}: {label: string; value: string}) {
    return (
        <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="text-base font-semibold text-slate-100">{value}</p>
        </div>
    );
}
