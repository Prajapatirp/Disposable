"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
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

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4">
        <Link
          href="/admin/dashboard"
          className="min-w-0 truncate text-lg font-semibold tracking-tight text-white"
        >
          Disposable Admin
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-lg text-white/90 hover:bg-white/20 hover:text-white"
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
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon
                className={cn("h-5 w-5 shrink-0", isActive ? "text-gray-700" : "")}
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
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-white/10">
        <Link
          href="/admin/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold text-white hover:bg-white/10"
          title="Disposable Admin"
        >
          D
        </Link>
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
                "flex items-center justify-center rounded-lg p-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon
                className={cn("h-5 w-5 shrink-0", isActive ? "text-gray-700" : "")}
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
      {/* Desktop: spacer for layout; actual sidebar is fixed below */}
      <div
        className={cn(
          "hidden shrink-0 transition-[width] duration-200 ease-out md:block",
          open ? "w-64" : "w-16"
        )}
        style={{ minHeight: "100vh" }}
        aria-hidden
      />
      {/* Desktop: fixed sidebar from top to above footer */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-14 z-30 hidden flex-col bg-[#7C3AED] transition-[width] duration-200 ease-out md:flex",
          open ? "w-64" : "w-16"
        )}
      >
        {open ? (
          <SidebarContent onClose={onClose} />
        ) : (
          <SidebarContentCollapsed />
        )}
      </aside>

      {/* Mobile: overlay sidebar (stops above footer when open) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-14 z-50 flex w-64 flex-col bg-[#7C3AED] shadow-xl transition-transform duration-200 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}
