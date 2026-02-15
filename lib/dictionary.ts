import fs from "node:fs";
import path from "node:path";
import { GRID_COLS } from "@/lib/config";

function loadDictionary(): Set<string> {
  const filePath = process.env.DICTIONARY_PATH?.trim() || path.join(process.cwd(), "data", "dictionary.txt");
  const raw = fs.readFileSync(filePath, "utf8");
  const words = raw
    .split(/\r?\n/)
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z]+$/.test(value) && value.length <= GRID_COLS);

  return new Set(words);
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
