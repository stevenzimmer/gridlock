import {useGameContext} from "./GameContext";
export function SelectedPanel() {
    const {
        completed,
        loading,
        selectedDisplay,
        canSubmitSelection,
        message,
        submitSelection,
    } = useGameContext();
    return (
        <div className="rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm">
            <p className="text-slate-200">
                Selected:{" "}
                <span className="font-semibold text-amber-200">
                    {selectedDisplay || "-"}
                </span>
            </p>
            <div className="mt-2 flex items-center gap-2">
                <button
                    type="button"
                    disabled={loading || completed || !canSubmitSelection}
                    onClick={() => {
                        void submitSelection();
                    }}
                    className="rounded border border-amber-300 px-3 py-1 font-medium text-amber-100 enabled:hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {loading ? "Saving..." : "Submit"}
                </button>
                <span className="text-xs text-slate-300">
                    {message ??
                        (completed
                            ? "Daily run completed."
                            : "Select 3+ contiguous letters in one row or double-click a letter to punch it out.")}
                </span>
            </div>
        </div>
    );
}
