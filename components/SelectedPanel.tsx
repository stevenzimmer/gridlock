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
      return "Keep going. Words need at least 3 letters.";
    }
    if (selectionPreview.status === "invalid") {
      return "Not in the current lexicon for this board.";
    }
    if (selectionPreview.status === "valid" && selectionPreview.resolvedWord) {
      return selectionPreview.rowClear
        ? `Valid: ${selectionPreview.resolvedWord} for +${selectionPreview.score} with row clear bonus.`
        : `Valid: ${selectionPreview.resolvedWord} for +${selectionPreview.score}.`;
    }
    if (completed) {
      return "Daily run completed.";
    }
    return "Select 3+ contiguous letters in one row or double-click a letter to punch it out.";
  }, [completed, message, selectionPreview]);

  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-slate-200">
          Selected: <span className="font-semibold text-amber-200">{selectedDisplay || "-"}</span>
        </p>
        {selectionPreview.status === "valid" ? (
          <p className="text-right text-xs font-semibold uppercase tracking-wide text-emerald-200">
            {selectionPreview.resolvedWord}
            {selectionPreview.score !== null ? ` · +${selectionPreview.score}` : ""}
          </p>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={loading || completed || !canSubmitSelection}
          onClick={() => {
            void submitSelection();
          }}
          className={[
            "rounded border border-amber-300 px-3 py-1 font-medium text-amber-100 enabled:hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-45",
            canSubmitSelection && !loading && !completed ? "submit-ready-glow" : ""
          ].join(" ")}
        >
          {loading ? "Saving..." : "Submit"}
        </button>
        <span className="text-xs text-slate-300">{helperText}</span>
      </div>
    </div>
  );
}
