import type { Tile } from "@/lib/types";

type TileViewProps = {
  tile: Tile;
  disabled: boolean;
  selected: boolean;
  invalid: boolean;
  markedInvalid: boolean;
  cursor: boolean;
};

export function TileView({
  tile,
  disabled,
  selected,
  invalid,
  markedInvalid,
  cursor
}: TileViewProps) {
  let label = "";
  let tone = "bg-slate-800/30 border-slate-700/50";

  if (tile.kind === "stone") {
    label = "■";
    tone = "bg-slate-900 border-slate-600 text-slate-300";
  }

  if (tile.kind === "letter") {
    label = tile.isWildcard ? "★" : tile.letter;
    tone = tile.isWildcard
      ? "bg-blue-500/80 border-blue-300 text-blue-50"
      : "bg-zinc-200 border-zinc-400 text-zinc-900";
  }

  return (
    <div
      className={[
        "flex h-full w-full items-center justify-center rounded border text-xl lg:text-3xl font-bold transition",
        disabled
          ? "bg-slate-700 border-slate-500 text-slate-300 opacity-80"
          : invalid
            ? "bg-red-600/80 border-red-300 text-red-50"
            : markedInvalid
              ? "bg-red-200/60 border-red-300 text-zinc-900"
              : tone,
        selected && !invalid && !disabled ? "scale-[1.06] ring-2 ring-amber-300" : "",
        invalid && !disabled ? "ring-2 ring-red-200" : "",
        cursor && !disabled ? "ring-2 ring-emerald-300" : ""
      ].join(" ")}
    >
      {label}
    </div>
  );
}
