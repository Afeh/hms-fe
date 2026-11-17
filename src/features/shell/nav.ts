import { LayoutDashboard, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Any of these permissions reveals the item (guide §4.3). */
  permissions?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users, permissions: ["patient:read", "patient:read:all"] },
];
