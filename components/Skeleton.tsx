export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className || ""}`}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function VisitRowSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <Skeleton className="h-8 w-8 mb-2" />
      <Skeleton className="h-6 w-20 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
