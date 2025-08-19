import { Skeleton } from "@/components/ui/skeleton";

export function CalendarSkeleton() {
  return (
    <div className="p-4 border rounded-md bg-card space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded" />
        ))}
      </div>
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

export function RoomCardSkeleton() {
  return (
    <div className="p-4 border rounded-md bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function BookingTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-8 gap-4 py-2 border-b">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}