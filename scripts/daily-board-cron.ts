import cron from "node-cron";
import { ensureDailyBoard } from "../lib/server/game-service";
import { getDateKey } from "../lib/server/date";

function tomorrowDateKey(): string {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + 1);
  return getDateKey(next);
}

async function generateBoards(): Promise<void> {
  const today = getDateKey();
  const tomorrow = tomorrowDateKey();

  await ensureDailyBoard(today);
  await ensureDailyBoard(tomorrow);

  console.log(`[daily-board-cron] ensured boards for ${today} and ${tomorrow}`);
}

async function main(): Promise<void> {
  const schedule = process.env.CRON_SCHEDULE?.trim() || "0 0 * * *";
  console.log(`[daily-board-cron] started with schedule '${schedule}' (UTC)`);

  await generateBoards();

  cron.schedule(
    schedule,
    () => {
      void generateBoards().catch((error) => {
        console.error("[daily-board-cron] generation failed", error);
      });
    },
    { timezone: "UTC" }
  );
}

void main().catch((error) => {
  console.error("[daily-board-cron] fatal startup error", error);
  process.exit(1);
});
