import {useGameContext} from "./GameContext";
import {HandFist} from "lucide-react";
export function Punchouts() {
    const {punchoutsRemaining} = useGameContext();
    return (
        <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
            <p className="text-sm font-semibold text-emerald-200 mb-2">
                {/* {punchoutsRemaining}{" "} */}
                <span className="uppercase tracking-wide text-emerald-300/80">
                    Punchouts
                </span>
            </p>
            <div className="flex flex-wrap gap-1">
                {Array.from({length: punchoutsRemaining}).map((_, idx) => (
                    <span
                        key={idx}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                        aria-hidden="true"
                    >
                        <HandFist className="h-5 w-5" aria-hidden="true" />
                    </span>
                ))}
            </div>
        </div>
    );
}
