import { useMemo } from "react";
import { useGameContext } from "./GameContext";

export function SelectedPanel() {
  const {
    completed,
    loading,
    selectedDisplay,
    canSubmitSelection,
    selectionPreview,
    message,
    submitSelection
  } = useGameContext();

  const helperText = useMemo(() => {
    if (message) {
      return message;
    }
    if (selectionPreview.status === "tooShort") {
      return "Stretch to 3 letters to arm the submit button.";
    }
    if (selectionPreview.status === "invalid") {
      return "That lane does not resolve to a valid board word.";
    }
    if (selectionPreview.status === "valid" && selectionPreview.resolvedWord) {
      return selectionPreview.rowClear
        ? `${selectionPreview.resolvedWord} is live with a row-clear bonus.`
        : `${selectionPreview.resolvedWord} is live.`;
    }
    if (completed) {
      return "Daily run completed.";
    }
    return "Drag across one row to build a word, or double-click a tile to punch it out.";
  }, [completed, message, selectionPreview]);

  return (
    <div className="game-action-panel rounded-[1.5rem] px-4 py-4 shadow-[0_18px_40px_rgba(2,6,23,0.4)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.32em] text-amber-200/80">
            Active Selection
          </p>
          <p className="truncate text-lg font-black tracking-tight text-white sm:text-xl">
            {selectedDisplay || "Select a lane"}
          </p>
          <p className="text-sm text-slate-300">{helperText}</p>
        </div>

        <div className="flex items-center gap-3">
          {selectionPreview.status === "valid" ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-right">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em] text-emerald-100/70">
                Preview
              </p>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-50">
                {selectionPreview.resolvedWord}
              </p>
              <p className="text-xs font-semibold text-emerald-100/80">
                +{selectionPreview.score ?? 0}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={loading || completed || !canSubmitSelection}
            onClick={() => {
              void submitSelection();
            }}
            className={[
              "rounded-2xl border px-5 py-3 text-sm font-black uppercase tracking-[0.2em] transition",
              canSubmitSelection && !loading && !completed
                ? "submit-ready-glow border-amber-200/60 bg-amber-300 text-slate-950 hover:bg-amber-200"
                : "border-white/12 bg-white/6 text-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
            ].join(" ")}
          >
            {loading ? "Saving" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
