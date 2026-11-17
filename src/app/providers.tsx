import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { SessionProvider } from "@/lib/auth/SessionProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status ?? 0;
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <SessionProvider>
            <TooltipProvider>
              <ToastProvider>{children}</ToastProvider>
            </TooltipProvider>
          </SessionProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
