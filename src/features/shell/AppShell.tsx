import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  LogOut,
  Monitor,
  Moon,
  Search,
  Sun,
  WifiOff,
} from "lucide-react";

import { BrandMark } from "@/components/domain/BrandMark";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { IconButton } from "@/components/ui/button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { useSession } from "@/lib/auth/SessionProvider";
import { useTheme, type ThemePreference } from "@/lib/theme/ThemeProvider";
import { cn, fullName } from "@/lib/utils";
import { usePermission } from "@/lib/permissions/Can";
import { CommandPalette } from "./CommandPalette";
import { IdleGuard } from "./IdleGuard";
import { NAV_ITEMS } from "./nav";

export function AppShell() {
  const { session, logout } = useSession();
  const { hasAny } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [offline, setOffline] = React.useState(() => !navigator.onLine);

  const items = NAV_ITEMS.filter(
    (item) => !item.permissions || hasAny(item.permissions),
  );

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Scroll to the top on route changes so a deep link never lands mid-page.
  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (!session) return null;

  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const displayName = session.user.display_name || fullName(session.user.name);
  const tenantMonogram = session.tenant.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only z-[80] rounded-md bg-brand-700 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <div className={cn("flex h-16 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
          <Link to="/dashboard" className="flex items-center gap-2.5 rounded-md" aria-label="HMS dashboard">
            <BrandMark size="sm" />
            {!collapsed ? <span className="text-h3 font-bold tracking-tight text-ink">HMS</span> : null}
          </Link>
        </div>

        <nav aria-label="Main navigation" className="flex-1 px-2.5 py-2">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group flex h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-semibold transition-colors duration-[120ms]",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-brand-50 text-brand-700 dark:bg-surface-2 dark:text-brand-300"
                        : "text-muted hover:bg-surface-2 hover:text-ink",
                    )
                  }
                >
                  <item.icon aria-hidden className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                  {!collapsed ? <span>{item.label}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-2.5">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-md px-3 text-small font-semibold text-muted hover:bg-surface-2 hover:text-ink",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeft
              aria-hidden
              className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")}
            />
            {!collapsed ? "Collapse" : null}
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 border-b transition-colors duration-200",
            scrolled ? "glass border-line/80" : "border-transparent bg-bg",
          )}
        >
          <div className="flex h-16 items-center gap-2 px-4 md:px-6 lg:px-8">
            <Link to="/dashboard" className="mr-1 flex items-center gap-2 lg:hidden" aria-label="HMS dashboard">
              <BrandMark size="sm" />
            </Link>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex h-10 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-3 text-left text-small text-faint shadow-1 hover:border-brand-300 hover:text-muted sm:max-w-[360px]"
            >
              <Search aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1 truncate">Search or jump to…</span>
              <kbd className="hidden rounded-sm border border-line px-1.5 py-0.5 font-mono text-[0.6875rem] text-faint sm:block">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1">
              <span
                className="mr-1 inline-flex items-center gap-2 rounded-pill border border-line bg-surface p-1 sm:px-2.5 sm:py-1.5"
                title={`${session.tenant.name} · ${session.tenant.plan}`}
              >
                <span
                  aria-hidden
                  className="gradient-brand inline-flex h-6 w-6 items-center justify-center rounded-pill text-[0.625rem] font-bold text-white"
                >
                  {tenantMonogram || "H"}
                </span>
                <span className="hidden max-w-[160px] truncate text-small font-semibold text-ink sm:block">
                  {session.tenant.name}
                </span>
              </span>

              <ThemeMenu />

              <Menu
                trigger={
                  <button
                    type="button"
                    className="ml-1 flex h-11 items-center gap-2 rounded-md px-1.5 hover:bg-surface-2"
                    aria-label="Account menu"
                  >
                    <Avatar name={displayName} seed={session.user._id} size="sm" />
                    <span className="hidden max-w-[140px] truncate text-small font-semibold text-ink md:block">
                      {displayName}
                    </span>
                  </button>
                }
              >
                <MenuLabel>Signed in</MenuLabel>
                <div className="px-2.5 pb-2">
                  <p className="truncate text-small font-semibold text-ink">{displayName}</p>
                  <p className="truncate text-[0.75rem] text-muted">{session.user.email}</p>
                  <p className="mt-1 truncate text-[0.75rem] text-faint">
                    {session.roles.map((role) => role.name).join(" · ") || "No roles"}
                  </p>
                </div>
                <MenuSeparator />
                <MenuItem onSelect={() => navigate("/dashboard")}>
                  <Monitor aria-hidden className="h-4 w-4" />
                  Dashboard
                </MenuItem>
                <MenuItem destructive onSelect={() => void signOut()}>
                  <LogOut aria-hidden className="h-4 w-4" />
                  Sign out
                </MenuItem>
              </Menu>
            </div>
          </div>

          {offline ? (
            <div className="flex items-center justify-center gap-2 border-t border-warning/20 bg-warning-soft px-4 py-2 text-small font-medium text-warning">
              <WifiOff aria-hidden className="h-4 w-4" />
              You are offline. Clinical changes are blocked until the connection returns.
            </div>
          ) : null}
        </header>

        <main id="main" className="page-gutter flex-1 pb-24 pt-5 lg:pb-12 lg:pt-7">
          <div className="mx-auto w-full max-w-[1440px]">
            <React.Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>

      <MobileTabs items={items} onSearch={() => setPaletteOpen(true)} />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <IdleGuard onTimeout={() => void signOut()} />
    </div>
  );
}

function ThemeMenu() {
  const { preference, setPreference } = useTheme();
  const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  const current = options.find((option) => option.value === preference) ?? options[2]!;
  const CurrentIcon = current.icon;

  return (
    <Menu
      trigger={
        <IconButton label={`Theme: ${current.label}`} className="h-10 w-10">
          <CurrentIcon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </IconButton>
      }
    >
      <MenuLabel>Appearance</MenuLabel>
      {options.map((option) => (
        <MenuItem
          key={option.value}
          onSelect={() => setPreference(option.value)}
          className={cn(option.value === preference && "bg-surface-2")}
        >
          <option.icon aria-hidden className="h-4 w-4" />
          {option.label}
          {option.value === preference ? (
            <span className="ml-auto text-small text-brand-700">✓</span>
          ) : null}
        </MenuItem>
      ))}
    </Menu>
  );
}

function MobileTabs({
  items,
  onSearch,
}: {
  items: typeof NAV_ITEMS;
  onSearch: () => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-30 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] font-semibold",
                  isActive ? "text-brand-700 dark:text-brand-300" : "text-muted",
                )
              }
            >
              <item.icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-14 w-full flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] font-semibold text-muted"
          >
            <Search aria-hidden className="h-5 w-5" strokeWidth={1.75} />
            Search
          </button>
        </li>
      </ul>
    </nav>
  );
}

function PageSkeleton() {
  return (
    <div aria-busy="true" className="motion-safe:animate-fade-up">
      <span className="sr-only">Loading page…</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-56" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
}

/** A tiny helper for pages that need a consistent action row header. */
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link
            to={back.to}
            className="mb-1.5 inline-flex items-center gap-1 text-small font-semibold text-muted hover:text-ink"
          >
            <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
            {back.label}
          </Link>
        ) : null}
        <h1 className="text-h1 text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-[0.9375rem] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
