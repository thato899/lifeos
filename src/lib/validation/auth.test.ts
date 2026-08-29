import { describe, expect, it } from "vitest";
import { credentialsSchema, signupSchema } from "./auth";

describe("credentialsSchema", () => {
  it("normalizes email casing and whitespace", () => {
    const result = credentialsSchema.parse({
      email: "  Alex@Demo.LifeOS.app  ",
      password: "lifeos-demo",
    });
    expect(result.email).toBe("alex@demo.lifeos.app");
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = credentialsSchema.safeParse({
      email: "alex@demo.lifeos.app",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = credentialsSchema.safeParse({
      email: "not-an-email",
      password: "lifeos-demo",
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("requires a non-empty name in addition to credentials", () => {
    const result = signupSchema.safeParse({
      email: "alex@demo.lifeos.app",
      password: "lifeos-demo",
      name: "",
    });
    expect(result.success).toBe(false);
  });
});
