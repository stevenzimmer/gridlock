import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { GRID_COLS } from "@/lib/config";

type DictionaryResolution = {
  word: string;
  score: number;
  rank: number;
};

function parseWords(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z]+$/.test(value) && value.length <= GRID_COLS);
}

function loadWordSource(filePath: string): string[] {
  return parseWords(fs.readFileSync(filePath, "utf8"));
}

function loadFileDictionary(): string[] {
  const explicitPath = process.env.DICTIONARY_PATH?.trim();
  const curatedPath = path.join(process.cwd(), "data", "dictionary-curated.txt");
  const fallbackPath = path.join(process.cwd(), "data", "dictionary.txt");
  const filePath = explicitPath || (fs.existsSync(curatedPath) ? curatedPath : fallbackPath);
  return loadWordSource(filePath);
}

function loadAspellDictionary(): string[] {
  if (process.env.ENABLE_ASPELL_MERGE !== "true") {
    return [];
  }

  const lang = process.env.ASPELL_LANG?.trim() || "en_US";

  try {
    const raw = execFileSync("aspell", ["dump", "master", `--lang=${lang}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 10 * 1024 * 1024
    });
    return parseWords(raw);
  } catch {
    return [];
  }
}

function buildDictionary(words: string[]): {
  words: string[];
  wordSet: Set<string>;
  wordsByLength: Map<number, string[]>;
  rankByWord: Map<string, number>;
} {
  const uniqueWords: string[] = [];
  const wordSet = new Set<string>();
  const wordsByLength = new Map<number, string[]>();
  const rankByWord = new Map<string, number>();

  for (const word of words) {
    if (wordSet.has(word)) {
      continue;
    }

    const rank = uniqueWords.length;
    uniqueWords.push(word);
    wordSet.add(word);
    rankByWord.set(word, rank);

    const bucket = wordsByLength.get(word.length);
    if (bucket) {
      bucket.push(word);
    } else {
      wordsByLength.set(word.length, [word]);
    }
  }

  return {
    words: uniqueWords,
    wordSet,
    wordsByLength,
    rankByWord
  };
}

function buildWildcardPatternIndex(
  wordsByLength: Map<number, string[]>,
  rankByWord: Map<string, number>
): Map<string, DictionaryResolution> {
  const index = new Map<string, DictionaryResolution>();

  for (const words of wordsByLength.values()) {
    for (const word of words) {
      const chars = word.split("");
      const length = chars.length;
      const resolution = toResolution(word, rankByWord);

      for (let i = 0; i < length; i++) {
        const oneWildcard = chars.slice();
        oneWildcard[i] = "*";
        setBetterResolution(index, oneWildcard.join(""), resolution);
      }

      for (let i = 0; i < length; i++) {
        for (let j = i + 1; j < length; j++) {
          const twoWildcards = chars.slice();
          twoWildcards[i] = "*";
          twoWildcards[j] = "*";
          setBetterResolution(index, twoWildcards.join(""), resolution);
        }
      }
    }
  }

  return index;
}

function setBetterResolution(
  index: Map<string, DictionaryResolution>,
  pattern: string,
  candidate: DictionaryResolution
) {
  const existing = index.get(pattern);
  if (!existing || compareResolutions(candidate, existing) < 0) {
    index.set(pattern, candidate);
  }
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

function toResolution(word: string, rankByWord: Map<string, number>): DictionaryResolution {
  return {
    word,
    score: scoreByLength(word.length),
    rank: rankByWord.get(word) ?? Number.MAX_SAFE_INTEGER
  };
}

function compareResolutions(left: DictionaryResolution, right: DictionaryResolution): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }
  if (left.rank !== right.rank) {
    return left.rank - right.rank;
  }
  return left.word.localeCompare(right.word);
}

function patternMatchesWord(pattern: string, word: string): boolean {
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "*" && pattern[i] !== word[i]) {
      return false;
    }
  }
  return true;
}

const RAW_WORDS = [...loadFileDictionary(), ...loadAspellDictionary()];
const { words: WORDS, wordSet: WORD_SET, wordsByLength: WORDS_BY_LENGTH, rankByWord: RANK_BY_WORD } =
  buildDictionary(RAW_WORDS);
const WILDCARD_PATTERN_INDEX = buildWildcardPatternIndex(WORDS_BY_LENGTH, RANK_BY_WORD);
const PATTERN_RESOLUTION_CACHE = new Map<string, DictionaryResolution | null>();

export const DICTIONARY = WORD_SET;
export const DICTIONARY_WORDS = WORDS;
export const DICTIONARY_BY_LENGTH = WORDS_BY_LENGTH;

export function resolveDictionaryPattern(pattern: string): DictionaryResolution | null {
  const upperPattern = pattern.toUpperCase();
  const cached = PATTERN_RESOLUTION_CACHE.get(upperPattern);
  if (cached !== undefined) {
    return cached;
  }

  const wildcardCount = [...upperPattern].filter((char) => char === "*").length;
  let resolved: DictionaryResolution | null = null;

  if (wildcardCount === 0) {
    resolved = WORD_SET.has(upperPattern) ? toResolution(upperPattern, RANK_BY_WORD) : null;
  } else if (wildcardCount <= 2) {
    resolved = WILDCARD_PATTERN_INDEX.get(upperPattern) ?? null;
  } else {
    const candidates = WORDS_BY_LENGTH.get(upperPattern.length) ?? [];
    for (const candidate of candidates) {
      if (!patternMatchesWord(upperPattern, candidate)) {
        continue;
      }

      const candidateResolution = toResolution(candidate, RANK_BY_WORD);
      if (!resolved || compareResolutions(candidateResolution, resolved) < 0) {
        resolved = candidateResolution;
      }
    }
  }

  PATTERN_RESOLUTION_CACHE.set(upperPattern, resolved);
  return resolved;
}
