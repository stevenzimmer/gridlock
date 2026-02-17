import { getDateKey } from "@/lib/server/date";
import { LeaderboardView } from "./LeaderboardView";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  return <LeaderboardView dateKey={getDateKey()} />;
}
