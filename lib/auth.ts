/**
 * Better Auth instance (docs/ARCHITECTURE.md § Authentication). Google is the
 * only social provider, registered only when its two env vars are present so
 * preview/CI builds don't need them. There are no roles: every student owns a
 * team, created by the Data Access Layer on first use (ADR-0005).
 */
import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { isE2eEnabled } from "./e2e";

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
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refreshed on activity
  },
  plugins: [nextCookies()],
});
