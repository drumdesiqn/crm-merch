export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`skeleton-shimmer rounded-md bg-slate-200 dark:bg-[#2e2e30] ${className || ""}`}
      {...props}
    />
  );
}

export function VisitRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b]">
      <Skeleton className="shrink-0 w-2 h-2 rounded-full" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="shrink-0 h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1a1a1b] border border-slate-200 dark:border-[#2e2e30] border-l-4 border-l-slate-200 dark:border-l-[#2e2e30] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="w-7 h-7 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-12 mb-1" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-56 rounded-lg" />
      </div>

      {/* Today banner */}
      <Skeleton className="h-16 w-full rounded-xl" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Filters row */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Two-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[1, 2].map((col) => (
          <div key={col} className="rounded-xl border border-slate-100 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-[#2e2e30] flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <div className="p-3 space-y-1.5">
              {[1, 2, 3, 4].map((i) => (
                <VisitRowSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanningSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="shrink-0 h-9 w-24 rounded-xl" />
        ))}
      </div>

      {/* Visit list */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <VisitRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function VisitDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Back button */}
      <Skeleton className="h-4 w-20 rounded" />

      {/* Store header card */}
      <div className="rounded-xl border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
      </div>

      {/* Status buttons */}
      <div className="rounded-xl border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] px-4 py-3">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="flex-1 h-9 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-[#2e2e30]">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="flex-1 h-10 rounded-none" />
          ))}
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoresListSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Sort/filter row */}
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-10 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>

      {/* Store cards */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-7 w-16 rounded-lg shrink-0" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StoreHistorySkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Back + header */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-20 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>

      {/* Timeline cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
