"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { AppError, errorToServiceResult } from "@/lib/errors/app-error";
import { signupSchema } from "@/lib/validation/auth";

const DEMO_EMAIL = "alex@demo.lifeos.app";
const DEMO_PASSWORD = "lifeos-demo";

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/app/dashboard",
    });
  } catch (error) {
    // NEXT_REDIRECT is how a successful signIn navigates — it must propagate,
    // not be swallowed as a login failure.
    if (error instanceof AuthError) {
      return errorToServiceResult(
        new Error("That email/password combination doesn't match an account."),
      );
    }
    throw error;
  }
}

export async function signupAction(formData: FormData) {
  try {
    const input = signupSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const existing = await db.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      return errorToServiceResult(
        AppError.conflict("An account with that email already exists."),
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    await db.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
  } catch (error) {
    return errorToServiceResult(error);
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/app/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return errorToServiceResult(
        new Error("Account created — please sign in."),
      );
    }
    throw error;
  }
}

/**
 * The one-click demo path the hackathon judges use (spec section 29 — "Do
 * not require complicated registration just to demonstrate the concept").
 * Signs in as the seeded demo account (prisma/seed.ts) with a fixed
 * password; disabled entirely if LIFEOS_ENABLE_DEMO isn't set, so a real
 * deployment can turn it off.
 */
export async function demoLoginAction() {
  if (process.env.LIFEOS_ENABLE_DEMO !== "true") {
    return errorToServiceResult(
      new Error("The demo account is disabled on this deployment."),
    );
  }
  try {
    await signIn("credentials", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      redirectTo: "/app/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return errorToServiceResult(
        new Error("Demo account isn't seeded yet — run `npm run db:seed`."),
      );
    }
    throw error;
  }
}
