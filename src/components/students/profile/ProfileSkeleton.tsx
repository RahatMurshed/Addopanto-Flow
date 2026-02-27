import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb skeleton */}
        <Skeleton className="w-48 h-4 rounded" />

        {/* Header card skeleton */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-20 w-20 rounded-full shrink-0 self-center sm:self-start" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          <div className="border-t border-border mt-4 pt-4 flex gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* 2-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-xl shadow-sm border border-border p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <Skeleton className="h-6 w-36 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
