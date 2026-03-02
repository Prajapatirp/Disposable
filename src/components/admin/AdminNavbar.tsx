"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LogOut,
  Menu,
  ChevronDown,
  Mail,
  Bell,
  User,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
      <header className="sticky top-0 z-40 flex h-14 shrink-0 flex-nowrap items-center gap-2 border-b border-white/10 bg-black px-3 shadow-sm sm:gap-4 sm:px-6 print:hidden">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 rounded-lg transition-colors",
            sidebarOpen
              ? "bg-white/10 text-white hover:bg-white/20"
              : "bg-white text-black hover:bg-white/90"
          )}
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="min-w-0 truncate text-sm font-medium text-white">
          Hello, {displayName}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Messages"
          >
            <Mail className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-lg text-white hover:bg-white/10"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <User className="h-4 w-4 text-white" />
              </span>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight text-white">
                  {displayName}
                </p>
                <p className="text-xs text-white/70">View Profile</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-white/70 transition-transform",
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
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
                  {email && (
                    <div className="border-b border-white/10 px-3 py-2">
                      <p className="truncate text-xs text-white/70">{email}</p>
                    </div>
                  )}
                  <Link
                    href="/admin/profile/change-password"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
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
