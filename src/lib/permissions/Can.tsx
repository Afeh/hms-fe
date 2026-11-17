import * as React from "react";

import { useSession } from "@/lib/auth/SessionProvider";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export function usePermission() {
  const { has, hasAny, session } = useSession();
  return { has, hasAny, permissions: session?.permissionSet ?? new Set<string>() };
}

/** Hides an action the user can never perform (guide §8.1). */
export function Can({
  permission,
  anyOf,
  fallback = null,
  children,
}: {
  permission?: string;
  anyOf?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { has, hasAny } = usePermission();
  const allowed = permission ? has(permission) : anyOf ? hasAny(anyOf) : true;
  return <>{allowed ? children : fallback}</>;
}

/**
 * An action inside an otherwise visible page: disabled with an explanation
 * rather than hidden, so the user understands why it is unavailable.
 */
export function GatedButton({
  permission,
  children,
  disabled,
  ...props
}: ButtonProps & { permission: string }) {
  const { has } = usePermission();
  if (has(permission)) {
    return (
      <Button disabled={disabled} {...props}>
        {children}
      </Button>
    );
  }
  return (
    <Tooltip content={`You need the ${permission} permission`}>
      <span tabIndex={0} className="inline-flex">
        <Button {...props} disabled aria-disabled="true">
          {children}
        </Button>
      </span>
    </Tooltip>
  );
}
