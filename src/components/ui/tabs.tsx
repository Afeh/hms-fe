import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-surface-2 p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-9 items-center rounded-pill px-3.5 text-small font-semibold text-muted transition-colors data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 focus:outline-none", className)} {...props} />;
}

/**
 * Route-backed tabs: underline on desktop, horizontally scrollable pills on mobile.
 * Each tab is a real link, so deep links and back/forward work.
 */
export function TabNav({ items }: { items: Array<{ to: string; label: string; end?: boolean }> }) {
  return (
    <nav aria-label="Patient sections" className="no-scrollbar -mx-1 overflow-x-auto">
      <ul className="flex min-w-max items-center gap-1 px-1 md:gap-1.5 md:border-b md:border-line md:pb-0">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex h-10 items-center whitespace-nowrap rounded-pill px-3.5 text-small font-semibold transition-colors duration-[120ms] md:rounded-none md:border-b-2 md:px-2.5",
                  isActive
                    ? "bg-brand-50 text-brand-700 md:border-brand-500 md:bg-transparent"
                    : "text-muted hover:bg-surface-2 hover:text-ink md:border-transparent md:bg-transparent",
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
