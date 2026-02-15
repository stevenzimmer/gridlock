import { NextResponse } from "next/server";
import { isValidPlayerId } from "@/lib/player-id";
import { isValidUsername, normalizeUsername } from "@/lib/username";
import { UsernameAlreadyExistsError, upsertPlayerUsername } from "@/lib/server/game-service";

type UpdateProfileBody = {
  playerId?: string;
  username?: string;
};

export async function POST(request: Request) {
  let body: UpdateProfileBody;

  try {
    body = (await request.json()) as UpdateProfileBody;
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

  const normalizedUsername = normalizeUsername(body.username ?? "");
  if (normalizedUsername.length > 0 && !isValidUsername(normalizedUsername)) {
    return NextResponse.json(
      { error: "Use 3-40 chars: letters, numbers, '.', '_' or '-'." },
      { status: 400 }
    );
  }

  try {
    const username = upsertPlayerUsername(
      playerId,
      normalizedUsername.length > 0 ? normalizedUsername : null
    );
    return NextResponse.json({
      playerId,
      username,
      displayName: username ?? playerId
    });
  } catch (error) {
    if (error instanceof UsernameAlreadyExistsError) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Unable to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
