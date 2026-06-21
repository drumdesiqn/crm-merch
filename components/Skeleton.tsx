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

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Week selector card */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Visits list */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        {[1, 2, 3, 4, 5].map((i) => (
          <VisitRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function PlanningSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Week selector */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      </div>

      {/* Visits list */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <VisitRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function VisitDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Visit info card */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>

      {/* Status selector */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Material type selector */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Notes section */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>

      {/* Photos section */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StoresListSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Search and filters */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Stores list */}
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function StoreHistorySkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
