import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard({ className = "" }) {
  return (
    <Card className={`glass-card border-0 p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-12 w-12 rounded-xl bg-gray-800" />
          <Skeleton className="h-6 w-20 rounded-md bg-gray-800" />
        </div>
        <Skeleton className="h-6 w-3/4 bg-gray-800" />
        <Skeleton className="h-4 w-full bg-gray-800" />
        <Skeleton className="h-4 w-5/6 bg-gray-800" />
        <Skeleton className="h-10 w-full rounded-lg bg-gray-800 mt-4" />
      </div>
    </Card>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-6">
      {Array(count).fill(0).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonCard;