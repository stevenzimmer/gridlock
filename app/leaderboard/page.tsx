import { getDateKeyForTimeZone } from "@/lib/server/date";
import { LeaderboardView } from "./LeaderboardView";

export const dynamic = "force-dynamic";

type LeaderboardPageProps = {
  searchParams: Promise<{ timeZone?: string }>;
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const { timeZone } = await searchParams;
  return <LeaderboardView dateKey={getDateKeyForTimeZone(timeZone)} timeZone={timeZone} />;
}
