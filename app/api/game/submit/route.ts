import { NextResponse } from "next/server";
import { submitPlayerSelection } from "@/lib/server/game-service";
import { isValidPlayerId } from "@/lib/player-id";
import type { Position } from "@/lib/types";

type SubmitBody = {
  playerId?: string;
  selection?: Position[];
};

export async function POST(request: Request) {
  let body: SubmitBody;

  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const playerId = body.playerId?.trim();
  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }
  if (!isValidPlayerId(playerId)) {
    return NextResponse.json({ error: "Invalid playerId format" }, { status: 400 });
  }

  const selection = Array.isArray(body.selection) ? body.selection : [];

  try {
    const result = await submitPlayerSelection(playerId, selection);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit selection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
