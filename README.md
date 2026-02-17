# Gridlock (Tetris + Scrabble)

This version uses the OpenAI SDK to:

-   generate a shared daily board,
-   generate and store that board's valid word list from a local dictionary,
-   persist each player's daily run state in a Neon PostgreSQL database via Drizzle ORM.

Word validation during gameplay now runs only against the daily board's stored valid-word list in Postgres (no per-submit OpenAI call).

## Recommended Database

Use Neon-hosted `PostgreSQL` for local and production environments.

## Environment

Create/update `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
DATABASE_URL=postgresql://...
DICTIONARY_PATH=./data/dictionary.txt
CRON_SECRET=optional-secret-for-cron-endpoint
CRON_SCHEDULE=0 0 * * *
```

## Install and Run

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## Migrate Existing SQLite Data (One-time)

If you have existing local SQLite data, import it into Neon:

```bash
npm run db:migrate-sqlite-neon
```

Optional override for SQLite file location:

```bash
SQLITE_PATH=./data/gravity-grid.sqlite npm run db:migrate-sqlite-neon
```

## Local Daily Cron Worker

```bash
npm run cron:daily-board
```

This process pre-generates today's and tomorrow's board on the schedule (UTC).

## API Endpoints

-   `GET /api/game/state?playerId=<id>`: loads/creates today's player state
-   `POST /api/game/submit`: validates and applies a move
-   `GET /leaderboard`: renders top 10 highest scores
-   `POST /api/cron/daily-board`: secured cron trigger (optional)

Use a stable `playerId` on the client to preserve daily progress. The UI now supports changing this to a username/handle.
