import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16 renamed middleware.js -> proxy.js (behavior is unchanged).
// This only performs the *optimistic* auth check described in the Auth.js
// docs: redirect obviously-unauthenticated requests away from /app before
// any page code runs. It is not the authorization boundary — every server
// action, route handler, and WebMCP tool re-checks `auth()` and re-scopes
// every query to the authenticated user's id (see src/lib/auth-scope.ts).
const { auth } = NextAuth(authConfig);
export const proxy = auth;

export const config = {
  matcher: ["/app/:path*"],
};
