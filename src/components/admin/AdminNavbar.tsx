"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LogOut,
  Menu,
  ChevronDown,
  User,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "./NotificationDropdown";

function getDisplayName(email: string | null | undefined): string {
  if (!email) return "Admin";
  const part = email.split("@")[0];
  if (!part) return "Admin";
  return part.charAt(0).toUpperCase() + part.slice(1);
}

interface AdminNavbarProps {
  email?: string | null;
  onToggleSidebar: () => void;
  sidebarOpen?: boolean;
}

export function AdminNavbar({ email, onToggleSidebar, sidebarOpen }: AdminNavbarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const displayName = getDisplayName(email ?? null);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 flex-nowrap items-center gap-2 border-b border-slate-200 bg-white px-3 shadow-sm sm:gap-4 sm:px-6 print:hidden">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 rounded-lg transition-colors",
            sidebarOpen
              ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
          )}
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="min-w-0 truncate text-sm font-medium text-slate-800">
          Hello, {displayName}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <NotificationDropdown />

          <div className="relative">
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-lg text-slate-800 hover:bg-blue-50 hover:text-blue-800"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                <User className="h-4 w-4" />
              </span>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight text-slate-900">
                  {displayName}
                </p>
                <p className="text-xs text-blue-600">View Profile</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-500 transition-transform",
                  userMenuOpen && "rotate-180"
                )}
              />
            </Button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden="true"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {email && (
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="truncate text-xs text-slate-500">{email}</p>
                    </div>
                  )}
                  <Link
                    href="/admin/profile/change-password"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
