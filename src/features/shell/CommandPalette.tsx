import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Search, UserPlus, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePermission } from "@/lib/permissions/Can";
import { NAV_ITEMS } from "./nav";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: "Go to" | "Actions";
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { has } = usePermission();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  const commands = React.useMemo<Command[]>(() => {
    const items: Command[] = NAV_ITEMS.filter(
      (item) => !item.permissions || item.permissions.some((permission) => has(permission)),
    ).map((item) => ({
      id: item.to,
      label: item.label,
      group: "Go to",
      icon: item.icon,
      run: () => navigate(item.to),
    }));

    if (has("patient:create")) {
      items.push({
        id: "new-patient",
        label: "Register a new patient",
        hint: "Patients",
        group: "Actions",
        icon: UserPlus,
        run: () => navigate("/patients?new=1"),
      });
    }
    return items;
  }, [has, navigate]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) => command.label.toLowerCase().includes(needle));
  }, [commands, query]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  React.useEffect(() => {
    setActive(0);
  }, [query]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onOpenChange(false);
    command.run();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(7,16,19,.5)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="glass fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-lg border shadow-3 focus:outline-none motion-safe:animate-fade-up"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <div className="flex items-center gap-2.5 border-b border-line/70 px-4">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, filtered.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  run(filtered[active]);
                }
              }}
              placeholder="Search or jump to…"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].id}` : undefined}
              aria-label="Search or jump to a page"
              className="h-14 w-full bg-transparent text-[0.9375rem] text-ink placeholder:text-faint focus:outline-none"
            />
            <kbd className="hidden rounded-sm border border-line px-1.5 py-0.5 font-mono text-[0.6875rem] text-faint sm:block">
              Esc
            </kbd>
          </div>

          <ul id={listId} role="listbox" aria-label="Commands" className="max-h-[52vh] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <li className="px-3 py-8 text-center text-small text-muted">
                No matches. Try a page name.
              </li>
            ) : (
              filtered.map((command, index) => {
                const Icon = command.icon;
                return (
                  <li
                    key={command.id}
                    id={`${listId}-${command.id}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => run(command)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-[0.9375rem]",
                      index === active ? "bg-brand-50 text-brand-900 dark:bg-surface-2 dark:text-ink" : "text-ink",
                    )}
                  >
                    <Icon aria-hidden className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    <span className="flex-1">{command.label}</span>
                    {command.hint ? <span className="text-small text-faint">{command.hint}</span> : null}
                    {index === active ? (
                      <CornerDownLeft aria-hidden className="h-3.5 w-3.5 text-faint" />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
