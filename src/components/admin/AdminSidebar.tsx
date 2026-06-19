"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ShoppingCart,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/billing", label: "Billing", icon: FileText },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  onToggle?: () => void;
}

function navLinkClass(isActive: boolean, collapsed = false) {
  return cn(
    "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
    collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
    isActive
      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
      : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
  );
}

function SidebarBrand({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <Link
        href="/admin/dashboard"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-sm transition hover:bg-blue-700"
        title="Disposable Admin"
      >
        <Package className="h-5 w-5 text-white" />
      </Link>
    );
  }
  return (
    <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
        <Package className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-blue-950">Disposable Admin</p>
        <p className="truncate text-xs text-blue-600/80">Product management</p>
      </div>
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4">
        <SidebarBrand />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(navLinkClass(isActive), isActive && "border-r-4 border-blue-600")}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-blue-600" : "text-slate-500"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function SidebarContentCollapsed() {
  const pathname = usePathname();
  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-slate-200">
        <SidebarBrand collapsed />
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                navLinkClass(isActive, true),
                isActive && "ring-2 ring-blue-600 ring-offset-1"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-blue-600" : "text-slate-500"
                )}
              />
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AdminSidebar({ open, onClose, onOpen }: AdminSidebarProps) {
  return (
    <>
      <div
        className={cn(
          "hidden shrink-0 transition-[width] duration-200 ease-out md:block print:hidden",
          open ? "w-64" : "w-16"
        )}
        style={{ minHeight: "100vh" }}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-14 z-30 hidden flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-200 ease-out md:flex print:hidden",
          open ? "w-64" : "w-16"
        )}
      >
        {open ? (
          <SidebarContent onClose={onClose} />
        ) : (
          <SidebarContentCollapsed />
        )}
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden print:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-14 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out md:hidden print:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}
