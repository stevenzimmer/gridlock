CREATE TABLE "daily_boards" (
	"date_key" text PRIMARY KEY NOT NULL,
	"grid_json" jsonb NOT NULL,
	"valid_words_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_daily_state" (
	"date_key" text NOT NULL,
	"player_id" text NOT NULL,
	"state_json" jsonb NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_daily_state_date_key_player_id_pk" PRIMARY KEY("date_key","player_id")
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"player_id" text PRIMARY KEY NOT NULL,
	"username" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_daily_state" ADD CONSTRAINT "player_daily_state_date_key_daily_boards_date_key_fk" FOREIGN KEY ("date_key") REFERENCES "public"."daily_boards"("date_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_player_profiles_username_unique" ON "player_profiles" USING btree ("username") WHERE "player_profiles"."username" IS NOT NULL;