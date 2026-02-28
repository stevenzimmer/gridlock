import { NextResponse } from "next/server";
import { rotatePlayerGrid } from "@/lib/server/game-service";
import { isValidPlayerId } from "@/lib/player-id";
import { getDateKeyForTimeZone } from "@/lib/server/date";
import type { RotationDirection } from "@/lib/types";

type RotateBody = {
  playerId?: string;
  direction?: RotationDirection;
  timeZone?: string;
};

export async function POST(request: Request) {
  let body: RotateBody;

  try {
    body = (await request.json()) as RotateBody;
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

  const direction = body.direction;
  if (direction !== "clockwise" && direction !== "counterclockwise") {
    return NextResponse.json({ error: "Missing or invalid direction" }, { status: 400 });
  }

  try {
    const result = await rotatePlayerGrid(playerId, direction, getDateKeyForTimeZone(body.timeZone));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to rotate board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
