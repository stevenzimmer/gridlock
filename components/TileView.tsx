import type { Tile } from "@/lib/types";
import { useEffect, useRef } from "react";

type SettleEffect = {
  dropRows: number;
  spawned: boolean;
};

type TileViewProps = {
  tile: Tile;
  disabled: boolean;
  selected: boolean;
  invalid: boolean;
  markedInvalid: boolean;
  clearing: boolean;
  settleEffect?: SettleEffect;
  settleNonce: number;
  rowFlashing: boolean;
  cursor: boolean;
};

export function TileView({
  tile,
  disabled,
  selected,
  invalid,
  markedInvalid,
  clearing,
  settleEffect,
  settleNonce,
  rowFlashing,
  cursor
}: TileViewProps) {
  const tileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!clearing || !tileRef.current) {
      return;
    }

    const animation = tileRef.current.animate(
      [
        { transform: "scale(1)", opacity: 1, filter: "brightness(1)" },
        { transform: "scale(1.13)", opacity: 1, filter: "brightness(1.24)", offset: 0.4 },
        { transform: "scale(0.76)", opacity: 0, filter: "brightness(0.75)" }
      ],
      {
        duration: 185,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards"
      }
    );

    return () => {
      animation.cancel();
    };
  }, [clearing]);

  useEffect(() => {
    if (!settleEffect || !tileRef.current || clearing) {
      return;
    }

    const startY = settleEffect.spawned ? -140 : -100 * settleEffect.dropRows;
    const startOpacity = settleEffect.spawned ? 0 : 0.28;
    const animation = tileRef.current.animate(
      [
        {
          transform: `translateY(${startY}%) scale(0.9)`,
          opacity: startOpacity
        },
        {
          transform: "translateY(9%) scale(1.06)",
          opacity: 1,
          offset: 0.72
        },
        {
          transform: "translateY(0%) scale(1)",
          opacity: 1
        }
      ],
      {
        duration: 340,
        easing: "cubic-bezier(0.2, 0.9, 0.25, 1)"
      }
    );

    return () => {
      animation.cancel();
    };
  }, [clearing, settleEffect, settleNonce]);

  let label = "";
  let tone = "bg-white border-slate-700";

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
      ref={tileRef}
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
        cursor && !disabled ? "ring-2 ring-emerald-300" : "",
        rowFlashing && !disabled ? "row-clear-flash" : ""
      ].join(" ")}
    >
      <span
        className="inline-flex transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: "rotate(var(--tile-upright-angle, 0deg))" }}
      >
        {label}
      </span>
    </div>
  );
}
