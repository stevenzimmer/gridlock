import { NextResponse } from "next/server";
import { getOrCreatePlayerState } from "@/lib/server/game-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId")?.trim();

  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  try {
    const current = await getOrCreatePlayerState(playerId);
    return NextResponse.json(current);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load game state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
