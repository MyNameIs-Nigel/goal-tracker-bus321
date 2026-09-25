-- ADR-0005 (docs/adr/0005-every-student-owns-a-team.md): every student owns a
-- team. Destructive by design, once: production held no tracker data. The
-- single-owner app tables, the settings row and user.role go; Better Auth's
-- tables, users and sessions stay.
DROP TABLE IF EXISTS "completions", "exceptions", "goals", "partner_checkins", "documents", "settings" CASCADE;
--> statement-breakpoint
DROP INDEX IF EXISTS "one_owner";
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "role";
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"contract_start" date,
	"contract_end" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_owner_id_unique" UNIQUE("owner_id"),
	CONSTRAINT "contract_range_check" CHECK ("teams"."contract_end" IS NULL OR "teams"."contract_start" IS NULL OR "teams"."contract_end" >= "teams"."contract_start")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cadence" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cadence_check" CHECK ("goals"."cadence" IN ('daily','weekly','monthly')),
	CONSTRAINT "title_length" CHECK (char_length("goals"."title") <= 120),
	CONSTRAINT "description_length" CHECK ("goals"."description" IS NULL OR char_length("goals"."description") <= 500)
);
--> statement-breakpoint
CREATE TABLE "completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"goal_id" uuid,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "date_range_check" CHECK ("exceptions"."ends_on" >= "exceptions"."starts_on" AND "exceptions"."ends_on" - "exceptions"."starts_on" <= 31),
	CONSTRAINT "reason_length" CHECK (char_length("exceptions"."reason") >= 1 AND char_length("exceptions"."reason") <= 280)
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_length" CHECK ("checkins"."note" IS NULL OR char_length("checkins"."note") <= 280)
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"team_id" uuid NOT NULL,
	"key" text NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_team_id_key_pk" PRIMARY KEY("team_id","key"),
	CONSTRAINT "key_check" CHECK ("documents"."key" IN ('vision','contract')),
	CONSTRAINT "body_html_length" CHECK (char_length("documents"."body_html") <= 20000)
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "completions" ADD CONSTRAINT "completions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_team_user_date" ON "checkins" USING btree ("team_id","user_id","date");
--> statement-breakpoint
CREATE UNIQUE INDEX "completions_goal_period" ON "completions" USING btree ("goal_id","period_start");
--> statement-breakpoint
CREATE INDEX "exceptions_team_id" ON "exceptions" USING btree ("team_id");
--> statement-breakpoint
CREATE INDEX "goals_team_id" ON "goals" USING btree ("team_id");