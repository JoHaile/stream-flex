import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  appName: "StreamFlix",
  database: prismaAdapter(db, { provider: "postgresql" }),
  // Email + password is the sole auth method for this MVP. Social providers
  // can be added later via auth.socialProviders without touching the cinema
  // feature.
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
  rateLimit: {
    enabled: true,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "streamflix",
  },
});

export type Session = typeof auth.$Infer.Session;