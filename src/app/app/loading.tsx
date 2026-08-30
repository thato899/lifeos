import { Skeleton } from "@/components/ui/skeleton";

// Next.js renders this automatically while a /app/* page's server
// component is fetching data (spec section 56: polished loading states,
// not a blank flash or a generic spinner).
export default function AppLoading() {
  return (
    <div
      className="flex max-w-4xl flex-col gap-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
