import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Card Skeleton - for course cards, prospect cards, system cards
 */
export function CardSkeleton({ count = 1, variant = 'default' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass-card border-0 border-white/5">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/**
 * Stats Skeleton - for dashboard stat cards
 */
export function StatsSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass-card border-0 border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/**
 * List Skeleton - for tables and lists
 */
export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass-card border-0 border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Table Row Skeleton
 */
export function TableRowSkeleton({ count = 5, columns = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-white/5">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="p-4">
              <Skeleton className="h-5 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Profile Skeleton
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card border-0 border-white/5">
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="glass-card border-0 border-white/5">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Page Skeleton - full page loading
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsSkeleton count={4} />
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}

/**
 * Course Grid Skeleton
 */
export function CourseGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CardSkeleton count={count} />
    </div>
  );
}

/**
 * Leaderboard Skeleton
 */
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Podium */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="glass-card border-0 border-white/5">
            <CardContent className="p-6 text-center">
              <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
              <Skeleton className="h-5 w-24 mx-auto mb-2" />
              <Skeleton className="h-8 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      <ListSkeleton count={7} />
    </div>
  );
}

/**
 * Dashboard Skeleton - comprehensive dashboard layout
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <Card className="glass-card border-0 border-white/5">
        <CardContent className="p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-5 w-96" />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsSkeleton count={4} />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <Card className="glass-card border-0 border-white/5">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <CardSkeleton count={2} />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="glass-card border-0 border-white/5">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <ListSkeleton count={5} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default {
  CardSkeleton,
  StatsSkeleton,
  ListSkeleton,
  TableRowSkeleton,
  ProfileSkeleton,
  PageSkeleton,
  CourseGridSkeleton,
  LeaderboardSkeleton,
  DashboardSkeleton
};