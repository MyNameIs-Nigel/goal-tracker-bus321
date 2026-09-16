/**
 * Browser-side Better Auth client, used by the sign-in buttons and the
 * user-menu sign-out control.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
