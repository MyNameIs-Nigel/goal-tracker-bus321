/**
 * Better Auth instance (docs/ARCHITECTURE.md § Authentication). Google is the
 * only social provider, registered only when its two env vars are present so
 * preview/CI builds don't need them. `role` is bootstrapped to `owner` for
 * `OWNER_EMAIL` on account creation, and re-asserted on every sign-in so a
 * bad row in the database can never lock the owner out (docs/adr/0001).
 */
import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { isE2eEnabled } from "./e2e";
import { isOwnerEmail } from "./owner";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    "https://bus321.nigel-smith.dev",
    "https://goal-tracker-bus321.vercel.app",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    "http://localhost:3000",
  ],
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  // Test mode only (docs/TESTING.md § Sign-in): email/password never appears
  // in the UI and is never registered in production — it exists so
  // `POST /api/e2e/sign-in` can create a real, correctly-signed session for
  // a seeded test user without reimplementing Better Auth's cookie signing.
  ...(isE2eEnabled()
    ? { emailAndPassword: { enabled: true, autoSignIn: false } }
    : {}),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "viewer",
        // Never client-settable. Only the owner-bootstrap hooks below and
        // lib/actions/people.ts's `setRole` (owner-only) ever write it.
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refreshed on activity
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (isOwnerEmail(user.email)) {
            return { data: { ...user, role: "owner" } };
          }
        },
      },
    },
    session: {
      create: {
        // Re-assert the owner role on every sign-in (AUTH-04): if the row
        // has drifted, it's corrected before the session exists.
        before: async (session) => {
          const [signedInUser] = await db
            .select({
              id: schema.user.id,
              email: schema.user.email,
              role: schema.user.role,
            })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId));

          if (
            signedInUser &&
            isOwnerEmail(signedInUser.email) &&
            signedInUser.role !== "owner"
          ) {
            await db
              .update(schema.user)
              .set({ role: "owner" })
              .where(eq(schema.user.id, signedInUser.id));
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
