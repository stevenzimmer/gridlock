import Link from "next/link";
import {useMemo} from "react";
import {useGameContext} from "./GameContext";
import {RulesChip} from "./RulesChip";
export function GameHeader() {
    const {dateKey} = useGameContext();
    const userTimeZone = useMemo(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        [],
    );
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center justify-between w-full">
                <h1 className="text-2xl font-black tracking-tight text-cyan-100 sm:text-3xl">
                    Gridlock
                </h1>
                <RulesChip />
            </div>

            <div className="flex items-center justify-between gap-2 w-full">
                <p className="rounded border border-slate-700 bg-slate-900/40 px-3 py-1 text-slate-200">
                    Daily board: {dateKey || "-"}
                </p>
                <Link
                    href={{
                        pathname: "/leaderboard",
                        query: {timeZone: userTimeZone},
                    }}
                    className="rounded border border-cyan-400/40 bg-cyan-900/30 px-3 py-1  font-semibold text-cyan-100 hover:bg-cyan-800/40"
                >
                    Leaderboard
                </Link>
            </div>
        </div>
    );
}
