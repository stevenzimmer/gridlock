import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { GRID_COLS } from "@/lib/config";

function parseWords(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z]+$/.test(value) && value.length <= GRID_COLS);
}

function loadFileDictionary(): Set<string> {
  const filePath = process.env.DICTIONARY_PATH?.trim() || path.join(process.cwd(), "data", "dictionary.txt");
  const raw = fs.readFileSync(filePath, "utf8");
  return new Set(parseWords(raw));
}

function loadAspellDictionary(): Set<string> {
  const lang = process.env.ASPELL_LANG?.trim() || "en_US";

  try {
    const raw = execFileSync("aspell", ["dump", "master", `--lang=${lang}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 10 * 1024 * 1024
    });
    return new Set(parseWords(raw));
  } catch {
    return new Set();
  }
}

function loadDictionary(): Set<string> {
  const merged = new Set<string>();
  for (const word of loadFileDictionary()) {
    merged.add(word);
  }
  for (const word of loadAspellDictionary()) {
    merged.add(word);
  }
  return merged;
}

function groupByLength(words: Set<string>): Map<number, string[]> {
  const grouped = new Map<number, string[]>();
  for (const word of words) {
    const bucket = grouped.get(word.length);
    if (bucket) {
      bucket.push(word);
      continue;
    }
    grouped.set(word.length, [word]);
  }
  return grouped;
}

function buildWildcardPatternIndex(wordsByLength: Map<number, string[]>): Map<string, string> {
  const index = new Map<string, string>();

  for (const words of wordsByLength.values()) {
    for (const word of words) {
      const chars = word.split("");
      const length = chars.length;

      for (let i = 0; i < length; i++) {
        const oneWildcard = chars.slice();
        oneWildcard[i] = "*";
        const onePattern = oneWildcard.join("");
        if (!index.has(onePattern)) {
          index.set(onePattern, word);
        }
      }

      for (let i = 0; i < length; i++) {
        for (let j = i + 1; j < length; j++) {
          const twoWildcards = chars.slice();
          twoWildcards[i] = "*";
          twoWildcards[j] = "*";
          const twoPattern = twoWildcards.join("");
          if (!index.has(twoPattern)) {
            index.set(twoPattern, word);
          }
        }
      }
    }
  }

  return index;
}

export const DICTIONARY = loadDictionary();
export const DICTIONARY_BY_LENGTH = groupByLength(DICTIONARY);
const WILDCARD_PATTERN_INDEX = buildWildcardPatternIndex(DICTIONARY_BY_LENGTH);
const PATTERN_RESOLUTION_CACHE = new Map<string, string | null>();

export function resolveDictionaryPattern(pattern: string): string | null {
  const upperPattern = pattern.toUpperCase();
  const cached = PATTERN_RESOLUTION_CACHE.get(upperPattern);
  if (cached !== undefined) {
    return cached;
  }

  const wildcardCount = [...upperPattern].filter((char) => char === "*").length;
  let resolved: string | null = null;

  if (wildcardCount === 0) {
    resolved = DICTIONARY.has(upperPattern) ? upperPattern : null;
  } else if (wildcardCount <= 2) {
    resolved = WILDCARD_PATTERN_INDEX.get(upperPattern) ?? null;
  } else {
    const candidates = DICTIONARY_BY_LENGTH.get(upperPattern.length) ?? [];
    resolved =
      candidates.find((candidate) => {
        for (let i = 0; i < upperPattern.length; i++) {
          if (upperPattern[i] !== "*" && upperPattern[i] !== candidate[i]) {
            return false;
          }
        }
        return true;
      }) ?? null;
  }

  PATTERN_RESOLUTION_CACHE.set(upperPattern, resolved);
  return resolved;
}
