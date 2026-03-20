import {useEffect, useRef} from "react";
import {useGameContext} from "./GameContext";
import {CircleX} from "lucide-react";
import {MAX_INVALID_SUBMISSIONS} from "@/lib/config";
export function SubmissionsRemaining() {
    const {invalidWordsSubmitted, invalidImpactNonce} = useGameContext();
    const panelRef = useRef<HTMLDivElement | null>(null);
    const invalidSubmissionsRemaining = Math.max(
        0,
        MAX_INVALID_SUBMISSIONS - invalidWordsSubmitted,
    );

    useEffect(() => {
        if (!invalidImpactNonce || !panelRef.current) {
            return;
        }
        const animation = panelRef.current.animate(
            [
                {transform: "scale(1)", boxShadow: "0 0 0 0 rgba(248,113,113,0)"},
                {
                    transform: "scale(1.04)",
                    boxShadow: "0 0 0 2px rgba(248,113,113,0.7)",
                },
                {transform: "scale(1)", boxShadow: "0 0 0 0 rgba(248,113,113,0)"},
            ],
            {
                duration: 250,
                easing: "ease-out",
            },
        );
        return () => {
            animation.cancel();
        };
    }, [invalidImpactNonce]);

    return (
        <div
            ref={panelRef}
            className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2"
        >
            <p className="text-sm font-semibold text-red-200 mb-2">
                {invalidSubmissionsRemaining} misses left
            </p>
            <div className="flex flex-wrap gap-1">
                {Array.from({length: invalidSubmissionsRemaining}).map(
                    (_, idx) => (
                        <span
                            key={idx}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-300 bg-red-50 text-sm font-black text-red-700"
                            aria-hidden="true"
                        >
                            <CircleX className="h-5 w-5" aria-hidden="true" />
                        </span>
                    ),
                )}
            </div>
        </div>
    );
}
