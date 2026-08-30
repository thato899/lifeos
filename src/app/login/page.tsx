import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/app/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        LifeOS
      </Link>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          Your life. Your agent. One workspace. Try the demo account to see it
          running with realistic data in seconds.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
