import {useGameContext} from "./GameContext";
import {CircleX} from "lucide-react";
import {MAX_INVALID_SUBMISSIONS} from "@/lib/config";
export function SubmissionsRemaining() {
    const {invalidWordsSubmitted} = useGameContext();
    const invalidSubmissionsRemaining = Math.max(
        0,
        MAX_INVALID_SUBMISSIONS - invalidWordsSubmitted,
    );
    return (
        <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
            <p className="tracking-wide text-white mb-2">
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
                            <CircleX className="h-4 w-4" aria-hidden="true" />
                        </span>
                    ),
                )}
            </div>
        </div>
    );
}
