import type { Tile } from "@/lib/types";
import { memo, useEffect, useRef } from "react";

type SettleEffect = {
  dropRows: number;
  spawned: boolean;
};

type TileViewProps = {
  tile: Tile;
  disabled: boolean;
  effectsReduced: boolean;
  selected: boolean;
  invalid: boolean;
  markedInvalid: boolean;
  clearing: boolean;
  settleEffect?: SettleEffect;
  settleNonce: number;
  rowFlashing: boolean;
  cursor: boolean;
};

function TileViewComponent({
  tile,
  disabled,
  effectsReduced,
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
    if (effectsReduced || !clearing || !tileRef.current) {
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
  }, [clearing, effectsReduced]);

  useEffect(() => {
    if (effectsReduced || !settleEffect || !tileRef.current || clearing) {
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
  }, [clearing, effectsReduced, settleEffect, settleNonce]);

  useEffect(() => {
    if (effectsReduced || !invalid || !tileRef.current || clearing) {
      return;
    }

    const animation = tileRef.current.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-7%)" },
        { transform: "translateX(6%)" },
        { transform: "translateX(-5%)" },
        { transform: "translateX(0)" }
      ],
      {
        duration: 190,
        easing: "ease-out"
      }
    );

    return () => {
      animation.cancel();
    };
  }, [effectsReduced, invalid, clearing]);

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
        selected && !invalid && !disabled
          ? `scale-[1.06] ring-2 ring-amber-300 ${effectsReduced ? "" : "selection-charge"}`
          : "",
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

function areTilesEqual(previous: Tile, next: Tile): boolean {
  if (previous.kind !== next.kind) {
    return false;
  }

  if (previous.kind === "letter" && next.kind === "letter") {
    return previous.letter === next.letter && previous.isWildcard === next.isWildcard;
  }

  return true;
}

function propsAreEqual(previous: TileViewProps, next: TileViewProps): boolean {
  return (
    areTilesEqual(previous.tile, next.tile) &&
    previous.disabled === next.disabled &&
    previous.effectsReduced === next.effectsReduced &&
    previous.selected === next.selected &&
    previous.invalid === next.invalid &&
    previous.markedInvalid === next.markedInvalid &&
    previous.clearing === next.clearing &&
    previous.settleNonce === next.settleNonce &&
    previous.rowFlashing === next.rowFlashing &&
    previous.cursor === next.cursor &&
    previous.settleEffect?.dropRows === next.settleEffect?.dropRows &&
    previous.settleEffect?.spawned === next.settleEffect?.spawned
  );
}

export const TileView = memo(TileViewComponent, propsAreEqual);
