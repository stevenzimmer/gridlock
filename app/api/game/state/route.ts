import { NextResponse } from "next/server";
import { getOrCreatePlayerState, getPlayerUsername } from "@/lib/server/game-service";
import { isValidPlayerId } from "@/lib/player-id";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId")?.trim();

  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }
  if (!isValidPlayerId(playerId)) {
    return NextResponse.json({ error: "Invalid playerId format" }, { status: 400 });
  }

  try {
    const current = await getOrCreatePlayerState(playerId);
    const username = getPlayerUsername(playerId);
    return NextResponse.json({ ...current, username });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load game state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
