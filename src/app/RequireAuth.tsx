import { Navigate, useLocation } from "react-router-dom";

import { BrandMark } from "@/components/domain/BrandMark";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/features/shell/AppShell";
import { useSession } from "@/lib/auth/SessionProvider";

export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();

  if (status === "loading") return <BootstrapSkeleton />;
  if (status === "anonymous") {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <AppShell />;
}

/** A branded shell while the session resolves, so the app never flashes login. */
function BootstrapSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your workspace…</span>
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-4 md:px-6 lg:px-8">
        <BrandMark size="sm" />
        <Skeleton className="h-5 w-32" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-pill" />
          <Skeleton className="h-9 w-9 rounded-pill" />
        </div>
      </div>
      <div className="page-gutter mx-auto w-full max-w-[1440px] py-7">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
