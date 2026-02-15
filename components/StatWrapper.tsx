import {Stat} from "./Stat";
import {useGameContext} from "./GameContext";
export function StatWrapper() {
    const {score, level, wordsCleared, longestWord} = useGameContext();
    return (
        <div className="grid gap-1 sm:gap-2 grid-cols-3">
            <Stat label="Score" value={score.toString()} />
            {/* <Stat label="Level" value={level.toString()} /> */}
            <Stat label="Words" value={wordsCleared.toString()} />
            <Stat label="Longest" value={longestWord || "-"} />
        </div>
    );
}
