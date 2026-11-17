import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";

export function Menu({
  trigger,
  children,
  align = "end",
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className={cn(
            "glass z-50 min-w-[200px] overflow-hidden rounded-md border p-1.5 shadow-3 motion-safe:animate-fade-up",
            className,
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Item> & { destructive?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-small font-medium outline-none transition-colors data-[highlighted]:bg-surface-2",
        destructive ? "text-danger" : "text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu.Label className="px-2.5 pb-1 pt-2 text-micro text-faint">
      {children}
    </DropdownMenu.Label>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1.5 h-px bg-line" />;
}
