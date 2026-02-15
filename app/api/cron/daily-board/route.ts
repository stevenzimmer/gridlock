import { NextResponse } from "next/server";
import { ensureDailyBoard } from "@/lib/server/game-service";
import { getDateKey } from "@/lib/server/date";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getDateKey();
  const tomorrowDate = new Date();
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = getDateKey(tomorrowDate);

  try {
    await ensureDailyBoard(today);
    await ensureDailyBoard(tomorrow);
    return NextResponse.json({ ok: true, generatedFor: [today, tomorrow] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
