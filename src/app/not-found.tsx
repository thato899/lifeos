import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        The page you&rsquo;re looking for doesn&rsquo;t exist, or you
        don&rsquo;t have access to it.
      </p>
      <Button asChild>
        <Link href="/">Back to LifeOS</Link>
      </Button>
    </main>
  );
}
