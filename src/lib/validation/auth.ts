import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const signupSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(100),
});
