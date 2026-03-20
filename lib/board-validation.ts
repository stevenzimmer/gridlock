import { MIN_WORD_LENGTH } from "@/lib/config";
import { countWildcardPattern } from "@/lib/game";
import type { BoardQualityMetrics, BoardValidation, Grid } from "@/lib/types";
import { resolveDictionaryPattern } from "@/lib/dictionary";

export function buildBoardValidation(grid: Grid): BoardValidation {
  const patterns: BoardValidation["patterns"] = {};
  const validWords = new Set<string>();

  for (const row of grid) {
    for (let start = 0; start < row.length; start++) {
      let pattern = "";

      for (let end = start; end < row.length; end++) {
        const tile = row[end];
        if (tile.kind !== "letter") {
          break;
        }

        pattern += tile.isWildcard ? "*" : tile.letter.toUpperCase();
        if (pattern.length < MIN_WORD_LENGTH) {
          continue;
        }

        const resolved = resolveDictionaryPattern(pattern);
        if (!resolved) {
          continue;
        }

        const wildcardCount = countWildcardPattern(pattern);
        patterns[pattern] = {
          word: resolved.word,
          wildcardCount,
          score: resolved.score
        };
        validWords.add(resolved.word);
      }
    }
  }

  const rankedWords = Array.from(validWords).sort((left, right) => {
    const scoreDelta = scoreByLength(right.length) - scoreByLength(left.length);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return left.localeCompare(right);
  });

  return {
    version: 2,
    validWords: rankedWords,
    patterns,
    quality: buildBoardQuality(rankedWords)
  };
}

export function buildBoardQuality(validWords: string[]): BoardQualityMetrics {
  let shortWords = 0;
  let mediumWords = 0;
  let longWords = 0;

  for (const word of validWords) {
    if (word.length <= 4) {
      shortWords++;
      continue;
    }
    if (word.length <= 6) {
      mediumWords++;
      continue;
    }
    longWords++;
  }

  return {
    totalWords: validWords.length,
    shortWords,
    mediumWords,
    longWords,
    topWords: validWords.slice(0, 6)
  };
}

function scoreByLength(length: number): number {
  if (length <= 2) return 0;
  if (length === 3) return 10;
  if (length === 4) return 20;
  if (length === 5) return 40;
  if (length === 6) return 80;
  if (length === 7) return 120;
  return 160 + 20 * (length - 8);
}
