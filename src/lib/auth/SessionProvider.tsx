import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/lib/api/endpoints";
import { ApiError, setAccessToken, setUnauthorizedHandler } from "@/lib/api/client";
import type { MeResponse, RoleSummary, TenantProfile, MeUser } from "@/types/api";

export interface Session {
  user: MeUser;
  roles: RoleSummary[];
  permissions: string[];
  permissionSet: Set<string>;
  tenant: TenantProfile;
  permVersion: number;
}

type Status = "loading" | "authenticated" | "anonymous";

interface SessionContextValue {
  status: Status;
  session: Session | null;
  login: (email: string, password: string, deviceLabel?: string) => Promise<void>;
  logout: () => Promise<void>;
  has: (permission: string) => boolean;
  hasAny: (permissions: string[]) => boolean;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

function toSession(profile: MeResponse): Session {
  return {
    user: profile.user,
    roles: profile.roles,
    permissions: profile.permissions,
    permissionSet: new Set(profile.permissions),
    tenant: profile.tenant,
    permVersion: profile.perm_version,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("loading");
  const [session, setSession] = React.useState<Session | null>(null);
  const queryClient = useQueryClient();

  const clear = React.useCallback(() => {
    setAccessToken(null);
    setSession(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  React.useEffect(() => {
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await authApi.me();
        if (cancelled) return;
        setSession(toSession(result.data));
        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          // Authenticated but the profile is refused: treat as signed out.
          clear();
          return;
        }
        setStatus("anonymous");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clear]);

  const login = React.useCallback(
    async (email: string, password: string, deviceLabel?: string) => {
      const result = await authApi.login(email, password, deviceLabel);
      setAccessToken(result.data.access_token);
      const profile = await authApi.me();
      setSession(toSession(profile.data));
      setStatus("authenticated");
    },
    [],
  );

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // A failed revoke must still clear local state.
    } finally {
      clear();
    }
  }, [clear]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      login,
      logout,
      has: (permission) => session?.permissionSet.has(permission) ?? false,
      hasAny: (permissions) => permissions.some((p) => session?.permissionSet.has(p) ?? false),
    }),
    [status, session, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = React.useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
