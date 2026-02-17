import { notFound } from "next/navigation";
import { LeaderboardView } from "../LeaderboardView";

export const dynamic = "force-dynamic";

type LeaderboardByDatePageProps = {
  params: Promise<{ dateKey: string }>;
};

function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function LeaderboardByDatePage({ params }: LeaderboardByDatePageProps) {
  const { dateKey } = await params;

  if (!isValidDateKey(dateKey)) {
    notFound();
  }

  return <LeaderboardView dateKey={dateKey} />;
}
