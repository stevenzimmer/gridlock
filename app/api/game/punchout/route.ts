import { NextResponse } from "next/server";
import { submitPlayerPunchout } from "@/lib/server/game-service";
import { isValidPlayerId } from "@/lib/player-id";
import type { Position } from "@/lib/types";

type PunchoutBody = {
  playerId?: string;
  position?: Position;
};

export async function POST(request: Request) {
  let body: PunchoutBody;

  try {
    body = (await request.json()) as PunchoutBody;
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

  const position = body.position;
  if (
    !position ||
    typeof position.row !== "number" ||
    typeof position.col !== "number" ||
    !Number.isInteger(position.row) ||
    !Number.isInteger(position.col)
  ) {
    return NextResponse.json({ error: "Missing or invalid position" }, { status: 400 });
  }

  try {
    const result = await submitPlayerPunchout(playerId, position);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit punchout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
