import { Stat } from "./Stat";
import { useGameContext } from "./GameContext";

export function StatWrapper() {
  const { score, wordsCleared, longestWord, scorePulseNonce } = useGameContext();

  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Score" value={score.toString()} pulseNonce={scorePulseNonce} />
      <Stat label="Words" value={wordsCleared.toString()} />
      <Stat label="Longest" value={longestWord || "-"} />
    </div>
  );
}
