import { auth } from "@/auth";

export class UnauthenticatedError extends Error {
  constructor() {
    super("You must be signed in to do that.");
    this.name = "UnauthenticatedError";
  }
}

/**
 * The single choke point every service-layer function and WebMCP tool must
 * call before touching the database. It re-derives the user id from the
 * server-side session on every call — never from a client-supplied field —
 * so a tool argument can never be used to read or write another user's data.
 *
 * See docs/security.md ("Data isolation") for why this exists as one shared
 * function instead of being re-implemented per route.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new UnauthenticatedError();
  }
  return userId;
}
