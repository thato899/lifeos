import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { credentialsSchema } from "@/lib/validation/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        // Never trust the shape of client-submitted credentials. This is the
        // same "treat every input as untrusted" rule the WebMCP tool layer
        // follows (see docs/security.md) — auth is just the first tool call
        // a "client" ever makes against LifeOS.
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!passwordMatches) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
