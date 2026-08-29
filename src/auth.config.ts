import type { NextAuthConfig } from "next-auth";

// Split out from auth.ts because this config (no Node-only APIs) is safe to
// import from proxy.ts, which runs on the Edge runtime and cannot load
// bcryptjs/Prisma. The Credentials provider itself lives in auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    // Credentials-based auth requires JWT sessions — there is no server-side
    // session record for Auth.js to look up on each request.
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnApp = request.nextUrl.pathname.startsWith("/app");
      if (isOnApp) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // populated in auth.ts (Credentials needs Node APIs)
} satisfies NextAuthConfig;
