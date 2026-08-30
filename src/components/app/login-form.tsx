"use client";

import { useActionState } from "react";
import { demoLoginAction, loginAction, signupAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

type ActionResult =
  | { success: true; data: unknown }
  | { success: false; error: { code: string; message: string } }
  | undefined;

async function runAction(
  action: (formData: FormData) => Promise<ActionResult>,
  _prev: ActionResult,
  formData: FormData,
) {
  return action(formData);
}

export function LoginForm() {
  const [signInState, signInFormAction, signInPending] = useActionState(
    (prev: ActionResult, formData: FormData) =>
      runAction(loginAction, prev, formData),
    undefined,
  );
  const [signUpState, signUpFormAction, signUpPending] = useActionState(
    (prev: ActionResult, formData: FormData) =>
      runAction(signupAction, prev, formData),
    undefined,
  );
  const [demoState, demoFormAction, demoPending] = useActionState(
    async () => demoLoginAction(),
    undefined,
  );

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <form action={demoFormAction}>
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={demoPending}
        >
          {demoPending ? "Signing in…" : "Try the demo"}
        </Button>
      </form>
      {demoState && !demoState.success && (
        <p className="text-destructive -mt-4 text-sm">
          {demoState.error.message}
        </p>
      )}
      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <Separator className="flex-1" />
        or use an account
        <Separator className="flex-1" />
      </div>

      <Tabs defaultValue="signin">
        <TabsList className="w-full">
          <TabsTrigger value="signin" className="flex-1">
            Sign in
          </TabsTrigger>
          <TabsTrigger value="signup" className="flex-1">
            Create account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-4">
          <form action={signInFormAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {signInState && !signInState.success && (
              <p className="text-destructive text-sm">
                {signInState.error.message}
              </p>
            )}
            <Button type="submit" disabled={signInPending}>
              {signInPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="mt-4">
          <form action={signUpFormAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {signUpState && !signUpState.success && (
              <p className="text-destructive text-sm">
                {signUpState.error.message}
              </p>
            )}
            <Button type="submit" disabled={signUpPending}>
              {signUpPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
