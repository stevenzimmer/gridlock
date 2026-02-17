import Link from "next/link";
import { getDateKey } from "@/lib/server/date";
import { getLeaderboard, getLeaderboardDateKeys } from "@/lib/server/game-service";

type LeaderboardViewProps = {
  dateKey: string;
};

export async function LeaderboardView({ dateKey }: LeaderboardViewProps) {
  const todayDateKey = getDateKey();
  const [leaderboard, availableDates] = await Promise.all([
    getLeaderboard(10, dateKey),
    getLeaderboardDateKeys(30)
  ]);
  const previousDates = availableDates.filter((entryDateKey) => entryDateKey < todayDateKey);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-cyan-100">Leaderboard</h1>
          <p className="text-sm text-slate-300">
            {dateKey === todayDateKey
              ? `Top 10 scores for today (${todayDateKey}).`
              : `Top 10 scores for ${dateKey}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dateKey !== todayDateKey ? (
            <Link
              href="/leaderboard"
              className="rounded-md border border-cyan-500/40 bg-cyan-900/30 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-800/40"
            >
              View Today
            </Link>
          ) : null}
          <Link
            href="/"
            className="rounded-md border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/70"
          >
            Back to Game
          </Link>
        </div>
      </header>

      {previousDates.length > 0 ? (
        <section className="mb-4 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            Previous Days
          </h2>
          <div className="flex flex-wrap gap-2">
            {previousDates.map((entryDateKey) => (
              <Link
                key={entryDateKey}
                href={entryDateKey === todayDateKey ? "/leaderboard" : `/leaderboard/${entryDateKey}`}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                  entryDateKey === dateKey
                    ? "border-cyan-400/50 bg-cyan-900/40 text-cyan-100"
                    : "border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800/70"
                }`}
              >
                {entryDateKey}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/70 text-left text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Words</th>
              <th className="px-4 py-3">Longest Word</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length > 0 ? (
              leaderboard
                .filter((item) => item.score)
                .map((entry, index) => (
                  <tr
                    key={`${entry.dateKey}:${entry.playerId}:${index}`}
                    className="border-t border-slate-800"
                  >
                    <td className="px-4 py-3 font-semibold text-cyan-200">#{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-slate-100">{entry.displayName}</td>
                    <td className="px-4 py-3 text-slate-100">{entry.score}</td>
                    <td className="px-4 py-3 text-slate-100">{entry.wordsCleared}</td>
                    <td className="px-4 py-3 text-slate-100">{entry.longestWord || "-"}</td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-300">
                  No scores yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
