import Link from "next/link";
import {useGameContext} from "./GameContext";

export function GameHeader() {
    const {dateKey} = useGameContext();
    return (
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
                    className="rounded border border-cyan-400/40 bg-cyan-900/30 px-3 py-1  font-semibold text-cyan-100 hover:bg-cyan-800/40"
                >
                    Leaderboard
                </Link>
            </div>
        </div>
    );
}
