export type RNG = {
  next: () => number;
  int: (maxExclusive: number) => number;
};

export function createSeededRng(seed: number): RNG {
  let state = seed >>> 0;
  if (state === 0) {
    state = 0x6d2b79f5;
  }

  return {
    next: () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    },
    int: (maxExclusive: number) => {
      if (maxExclusive <= 0) {
        return 0;
      }
      return Math.floor((state = (1664525 * state + 1013904223) >>> 0) / 0x100000000 * maxExclusive);
    }
  };
}
