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

export const DICTIONARY = loadDictionary();
export const DICTIONARY_BY_LENGTH = groupByLength(DICTIONARY);
