import {useGameContext} from "./GameContext";
export function PlayerId() {
    const {
        playerId,
        usernameDraft,
        errorMessage,
        savingUsername,
        setUsernameDraft,
        updateUsername,
    } = useGameContext();
    return (
        <div className="mb-2">
            <p className="mb-2 break-all text-xs text-slate-400">
                Player ID: {playerId || "-"}
            </p>
            <form
                className="flex gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void updateUsername();
                }}
            >
                <input
                    type="text"
                    value={usernameDraft}
                    onChange={(event) => setUsernameDraft(event.target.value)}
                    placeholder="Create a handle like neonfox"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                    maxLength={40}
                    aria-label="Username"
                />
                <button
                    type="submit"
                    disabled={savingUsername}
                    className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold text-slate-100 enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {savingUsername ? "Saving..." : "Update"}
                </button>
            </form>
            <p className="mt-1 text-xs text-slate-400">
                Username is optional. Leave blank to use your player ID.
            </p>
            {errorMessage && (
                <div className="text-sm text-red-400">
                    <p>{errorMessage}</p>
                </div>
            )}
        </div>
    );
}
