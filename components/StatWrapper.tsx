import {Stat} from "./Stat";
import {useGameContext} from "./GameContext";
export function StatWrapper() {
    const {score, level, wordsCleared, longestWord} = useGameContext();
    return (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Score" value={score.toString()} />
            <Stat label="Level" value={level.toString()} />
            <Stat label="Words" value={wordsCleared.toString()} />
            <Stat label="Longest" value={longestWord || "-"} />
        </div>
    );
}
