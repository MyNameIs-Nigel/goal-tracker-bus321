CREATE TABLE "admins" (
	"email" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "disabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
INSERT INTO "admins" ("email") VALUES ('nigel.nds.smith@gmail.com') ON CONFLICT DO NOTHING;
