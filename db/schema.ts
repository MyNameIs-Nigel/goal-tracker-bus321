/**
 * Drizzle schema — the code-side source of truth, mirroring docs/DATA_MODEL.md.
 * A PR that changes one changes both.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Better Auth tables, shape per its docs, plus the `role` column and the
// partial unique index that guarantees exactly one owner (DATA_MODEL.md).
// ---------------------------------------------------------------------------

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("role_check", sql`${table.role} IN ('owner','partner','viewer')`),
    uniqueIndex("one_owner")
      .on(table.role)
      .where(sql`${table.role} = 'owner'`),
  ],
);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// App tables (docs/DATA_MODEL.md § Tables). Migration 0001 creates all of
// these, including the documents/settings seed rows, so Phases 2–3 add data,
// not structure.
// ---------------------------------------------------------------------------

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    cadence: text("cadence").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "cadence_check",
      sql`${table.cadence} IN ('daily','weekly','monthly')`,
    ),
    check("title_length", sql`char_length(${table.title}) <= 120`),
    check(
      "description_length",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`,
    ),
  ],
);

export const completions = pgTable(
  "completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("completions_goal_period").on(table.goalId, table.periodStart),
  ],
);

export const exceptions = pgTable(
  "exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id").references(() => goals.id, {
      onDelete: "cascade",
    }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "date_range_check",
      sql`${table.endsOn} >= ${table.startsOn} AND ${table.endsOn} - ${table.startsOn} <= 31`,
    ),
    check(
      "reason_length",
      sql`char_length(${table.reason}) >= 1 AND char_length(${table.reason}) <= 280`,
    ),
  ],
);

export const partnerCheckins = pgTable(
  "partner_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("partner_checkins_user_date").on(table.userId, table.date),
    check(
      "note_length",
      sql`${table.note} IS NULL OR char_length(${table.note}) <= 280`,
    ),
  ],
);

export const documents = pgTable(
  "documents",
  {
    key: text("key").primaryKey(),
    bodyHtml: text("body_html").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    check("key_check", sql`${table.key} IN ('vision','contract')`),
    check("body_html_length", sql`char_length(${table.bodyHtml}) <= 20000`),
  ],
);

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey(),
    contractStart: date("contract_start"),
    contractEnd: date("contract_end"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("single_row", sql`${table.id} = 1`),
    check(
      "contract_range_check",
      sql`${table.contractEnd} IS NULL OR ${table.contractStart} IS NULL OR ${table.contractEnd} >= ${table.contractStart}`,
    ),
  ],
);
