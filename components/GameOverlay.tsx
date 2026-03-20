"use client";

import {useMemo, useState} from "react";
import {useGameContext} from "./GameContext";

function getSkillTag(
    score: number,
    level: number,
    wordsCleared: number,
): string {
    if (score >= 450 || level >= 7 || wordsCleared >= 20) {
        return "Letter Gravity Master";
    }
    if (score >= 260 || level >= 5 || wordsCleared >= 14) {
        return "Wordfall Specialist";
    }
    if (score >= 140 || level >= 3 || wordsCleared >= 9) {
        return "Gridlock Tactician";
    }
    return "Rookie Block Breaker";
}

function getHeatMeter(level: number): string {
    return "🔥".repeat(Math.max(1, Math.min(6, level)));
}

export function GameOverlay() {
    const {score, level, wordsCleared, longestWord, dateKey} = useGameContext();
    const [copyStatus, setCopyStatus] = useState("");
    const shareStatus = "";

    const shareBaseUrl =
        typeof window === "undefined" ? "" : window.location.origin;
    const boardUrl = `${shareBaseUrl}/leaderboard/${dateKey}`;

    const shareText = useMemo(() => {
        const skillTag = getSkillTag(score, level, wordsCleared);
        const heatMeter = getHeatMeter(level);
        const longest = longestWord || "---";
        return [
            `Gridlock Daily ${dateKey}`,
            `Score ${score} | Level ${level} ${heatMeter}`,
            `Words cleared: ${wordsCleared}`,
            `Longest word: ${longest}`,
            `Title unlocked: ${skillTag}`,
            `Can you top this board?`,
        ].join("\n\n");
    }, [dateKey, level, longestWord, score, wordsCleared]);

    const fullShareText = boardUrl ? `${shareText}\n${boardUrl}` : shareText;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullShareText);
            setCopyStatus("Copied");
            window.setTimeout(() => setCopyStatus(""), 1600);
        } catch {
            setCopyStatus("Copy failed");
            window.setTimeout(() => setCopyStatus(""), 1600);
        }
    };

    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.6rem] bg-slate-950/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[1.75rem] border border-white/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,14,28,0.96))] px-5 py-5 text-slate-100 shadow-2xl">
                <div className="game-over-stamp mb-3 py-2 sm:py-6 text-center text-3xl font-black uppercase tracking-[0.2em] sm:text-5xl">
                    Gridlock
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 text-sm font-semibold sm:text-base">
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
                <div className="mb-3 rounded-md border border-cyan-300/30 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100 sm:text-sm">
                    {shareText}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold sm:text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            void handleCopy();
                        }}
                        className="rounded-md border border-cyan-300/40 bg-cyan-800/30 px-2 py-2 text-cyan-100 hover:bg-cyan-700/35"
                    >
                        Copy to share {copyStatus ? `(${copyStatus})` : ""}
                    </button>
                </div>
                {shareStatus ? (
                    <div className="mt-2 text-center text-xs font-semibold text-emerald-200">
                        {shareStatus}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
