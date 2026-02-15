import Link from "next/link";
import {useState} from "react";
import {MAX_INVALID_SUBMISSIONS} from "@/lib/config";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import {MIN_WORD_LENGTH} from "@/lib/config";

type HUDProps = {
    playerId: string;
    playerDisplayName: string;
    hasUsername: boolean;
    usernameDraft: string;
    score: number;
    level: number;
    wordsCleared: number;
    longestWord: string;
    punchoutsRemaining: number;
    invalidWordsSubmitted: number;
    dateKey: string;
    completed: boolean;
    lastWord: string;
    loading: boolean;
    selectedDisplay: string;
    canSubmitSelection: boolean;
    message: string | null;
    savingUsername: boolean;
    onUsernameDraftChange: (value: string) => void;
    onUsernameSave: () => void;
    onSubmitSelection: () => void;
};

export function HUD({
    playerId,
    playerDisplayName,
    hasUsername,
    usernameDraft,
    score,
    level,
    wordsCleared,
    longestWord,
    punchoutsRemaining,
    invalidWordsSubmitted,
    dateKey,
    completed,
    loading,
    lastWord,
    selectedDisplay,
    canSubmitSelection,
    message,
    savingUsername,
    onUsernameDraftChange,
    onUsernameSave,
    onSubmitSelection,
}: HUDProps) {
    const invalidSubmissionsRemaining = Math.max(
        0,
        MAX_INVALID_SUBMISSIONS - invalidWordsSubmitted,
    );
    const [rulesDrawerOpen, setRulesDrawerOpen] = useState(false);
    return (
        <header className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl font-black tracking-tight text-cyan-100 sm:text-3xl">
                    Grid Lock
                </h1>
                <div className="flex items-center justify-between gap-2 w-full">
                    <p className="rounded border border-slate-700 bg-slate-900/40 px-3 py-1 text-slate-200">
                        Daily board: {dateKey || "-"}
                    </p>
                    <Link
                        href="/leaderboard"
                        className="rounded border border-cyan-400/40 bg-cyan-900/30 px-3 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-800/40"
                    >
                        Leaderboard
                    </Link>
                </div>
            </div>

            <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
                <div className="flex justify-between items-center">
                    {hasUsername && (
                        <p className="text-sm uppercase tracking-wide text-slate-400">
                            Player:{" "}
                            <span className="mb-2 break-all font-semibold text-slate-100 lowercase">
                                {playerDisplayName || "-"}
                            </span>
                        </p>
                    )}
                    {!hasUsername ? (
                        <div>
                            <p className="mb-2 break-all text-xs text-slate-400">
                                ID: {playerId || "-"}
                            </p>
                            <form
                                className="flex gap-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    onUsernameSave();
                                }}
                            >
                                <input
                                    type="text"
                                    value={usernameDraft}
                                    onChange={(event) =>
                                        onUsernameDraftChange(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Try a handle like neonfox"
                                    className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950/50 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500"
                                    maxLength={40}
                                    aria-label="Username"
                                />
                                <button
                                    type="submit"
                                    disabled={savingUsername}
                                    className="rounded border border-slate-500 px-3 py-1 text-xs font-semibold text-slate-100 enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {savingUsername ? "Saving..." : "Update"}
                                </button>
                            </form>
                            <p className="mt-1 text-xs text-slate-400">
                                Username is optional. Leave blank to use your
                                player ID.
                            </p>
                        </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                        <Drawer
                            open={rulesDrawerOpen}
                            onOpenChange={setRulesDrawerOpen}
                        >
                            <DrawerTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-900/80 px-2 py-1 text-xs font-semibold text-cyan-100 hover:border-cyan-500/80 hover:text-cyan-50"
                                >
                                    <span>Rules</span>
                                    <InfoIcon />
                                </button>
                            </DrawerTrigger>
                            <DrawerContent
                                side="left"
                                className="w-[94vw] max-w-lg"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <DrawerHeader className="space-y-1">
                                            <DrawerTitle>
                                                How Grid Lock Works
                                            </DrawerTitle>
                                            <DrawerDescription>
                                                Build words, clear tiles, and
                                                survive the board for the daily
                                                run.
                                            </DrawerDescription>
                                        </DrawerHeader>
                                        <DrawerClose asChild>
                                            <button
                                                type="button"
                                                className="rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-100"
                                            >
                                                Close
                                            </button>
                                        </DrawerClose>
                                    </div>

                                    <section className="space-y-2 text-sm text-slate-200">
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                                            Core Rules
                                        </h3>
                                        <p>
                                            Select letters horizontally in a
                                            single row to form a word of at
                                            least {MIN_WORD_LENGTH} letters.
                                        </p>
                                        <p>
                                            Submit with Enter (or the Submit
                                            button). Accepted words clear those
                                            tiles and gravity drops letters
                                            down.
                                        </p>
                                        <p>
                                            You cannot select stones. If the
                                            path crosses a stone, that selection
                                            is blocked.
                                        </p>
                                    </section>

                                    <section className="space-y-2 text-sm text-slate-200">
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                                            Punchouts
                                        </h3>
                                        <p>
                                            Double-click a letter to punch it
                                            out instantly. This is useful when a
                                            blocker tile is ruining future word
                                            paths.
                                        </p>
                                        <p>
                                            Each punchout consumes 1 charge. You
                                            get a limited number per run, shown
                                            in the HUD.
                                        </p>
                                        <p>
                                            No charges left means no more
                                            punchouts, so spend them to protect
                                            strong future lanes.
                                        </p>
                                    </section>

                                    <section className="space-y-2 text-sm text-slate-200">
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                                            Invalid Submissions
                                        </h3>
                                        <p>
                                            Submitting a non-dictionary word or
                                            otherwise invalid selection
                                            increases your invalid submissions
                                            count.
                                        </p>
                                        <p>
                                            Invalid words are dangerous: hit the
                                            run limit and the game ends
                                            immediately, even if moves still
                                            exist.
                                        </p>
                                        <p>
                                            When in doubt, shorten risky words
                                            and lock in reliable points.
                                        </p>
                                    </section>

                                    <section className="space-y-2 text-sm text-slate-200">
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                                            Points System
                                        </h3>
                                        <div className="overflow-hidden rounded-md border border-slate-700">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-800/90 text-slate-100">
                                                    <tr>
                                                        <th className="px-3 py-2 font-semibold">
                                                            Action
                                                        </th>
                                                        <th className="px-3 py-2 font-semibold">
                                                            Points Impact
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-slate-900/70 text-slate-200">
                                                    <tr className="border-t border-slate-700">
                                                        <td className="px-3 py-2">
                                                            Accepted word
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            Earn points based on
                                                            word length
                                                        </td>
                                                    </tr>
                                                    <tr className="border-t border-slate-700">
                                                        <td className="px-3 py-2">
                                                            Longer words
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            Higher reward and
                                                            faster level
                                                            progress
                                                        </td>
                                                    </tr>
                                                    <tr className="border-t border-slate-700">
                                                        <td className="px-3 py-2">
                                                            Invalid word
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            No points plus 1
                                                            invalid strike
                                                        </td>
                                                    </tr>
                                                    <tr className="border-t border-slate-700">
                                                        <td className="px-3 py-2">
                                                            Punchout
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            Board control
                                                            utility, limited
                                                            uses
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="space-y-2 text-sm text-slate-200">
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                                            Daily Run
                                        </h3>
                                        <p>
                                            One persistent run per day for each
                                            player. Everyone gets the same board
                                            for that date.
                                        </p>
                                        <p>
                                            Your progress is saved, so you can
                                            return and continue until the run
                                            ends.
                                        </p>
                                    </section>
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Score" value={score.toString()} />
                <Stat label="Level" value={level.toString()} />
                <Stat label="Words" value={wordsCleared.toString()} />
                <Stat label="Longest" value={longestWord || "-"} />
            </div>

            <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                        aria-hidden="true"
                    >
                        <PunchoutIcon />
                    </span>
                    <span>
                        {punchoutsRemaining}{" "}
                        <span className="uppercase tracking-wide text-emerald-300/80">
                            Punchouts
                        </span>{" "}
                        remaining
                    </span>
                </p>
            </div>

            <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-white mb-2">
                    {invalidSubmissionsRemaining} invalid submissions remaining.
                </p>
                <div className="flex flex-wrap gap-1">
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

function InfoIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="10" x2="12" y2="16" />
            <circle cx="12" cy="7" r="0.8" fill="currentColor" stroke="none" />
        </svg>
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

function PunchoutIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M10 6.5a2.5 2.5 0 0 1 5 0v2H10z" />
            <path d="M9.5 9h6.5a2 2 0 0 1 2 2v3.5A3.5 3.5 0 0 1 14.5 18h-5A3.5 3.5 0 0 1 6 14.5V12a3 3 0 0 1 3-3Z" />
            <path d="M6 12H4.5A2.5 2.5 0 0 0 2 14.5v0A2.5 2.5 0 0 0 4.5 17H6" />
        </svg>
    );
}
