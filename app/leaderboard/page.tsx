import Link from "next/link";
import { getLeaderboard } from "@/lib/server/game-service";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const leaderboard = getLeaderboard(10);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-cyan-100">Leaderboard</h1>
          <p className="text-sm text-slate-300">Top 10 highest scores across all saved runs.</p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/70"
        >
          Back to Game
        </Link>
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/70 text-left text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Words</th>
              <th className="px-4 py-3">Longest Word</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <tr key={`${entry.dateKey}:${entry.playerId}:${index}`} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-semibold text-cyan-200">#{index + 1}</td>
                  <td className="px-4 py-3 font-mono text-slate-100">{entry.displayName}</td>
                  <td className="px-4 py-3 text-slate-100">{entry.score}</td>
                  <td className="px-4 py-3 text-slate-100">{entry.level}</td>
                  <td className="px-4 py-3 text-slate-100">{entry.wordsCleared}</td>
                  <td className="px-4 py-3 text-slate-100">{entry.longestWord || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-300">
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
