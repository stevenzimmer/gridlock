import {PlayerId} from "./PlayerId";
import {useGameContext} from "./GameContext";
export function PlayerPanel() {
    const {playerDisplayName, hasUsername} = useGameContext();
    return (
        <div className="rounded border border-slate-700 bg-slate-900/40 px-3 py-2">
            {!hasUsername ? <PlayerId /> : null}
            <div className="flex justify-between items-center">
                {hasUsername && (
                    <p className="text-sm uppercase tracking-wide text-slate-400">
                        Player:{" "}
                        <span className="mb-2 break-all font-semibold text-slate-100 lowercase">
                            {playerDisplayName || "-"}
                        </span>
                    </p>
                )}
            </div>
        </div>
    );
}
