"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Next.js's error boundary convention for the /app/* segment. Catches
// anything a Server Component throws that isn't one of our own AppError ->
// ServiceResult conversions (those never throw past the service layer —
// see docs/security.md "Safe error messages"), so this is the last resort,
// not the everyday error path.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error in /app:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertTriangle className="text-muted-foreground size-8" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Something went wrong loading this page.</p>
        <p className="text-muted-foreground text-sm">
          This has been logged. You can try again, or head back to the
          dashboard.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/app/dashboard">Back to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
