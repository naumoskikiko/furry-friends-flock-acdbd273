import { Skeleton } from "@/components/ui/skeleton";

const FeedPostSkeleton = () => (
  <div className="border-b border-border bg-card">
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
    <Skeleton className="aspect-square w-full rounded-none" />
    <div className="px-4 py-3 space-y-2">
      <div className="flex gap-4">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-2 w-12" />
    </div>
  </div>
);

const FeedSkeleton = () => (
  <div className="mx-auto max-w-lg">
    {[1, 2, 3].map((i) => (
      <FeedPostSkeleton key={i} />
    ))}
  </div>
);

export default FeedSkeleton;
