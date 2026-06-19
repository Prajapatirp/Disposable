"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminNavbar } from "./AdminNavbar";
import { AdminFooter } from "./AdminFooter";

interface AdminDashboardShellProps {
  children: React.ReactNode;
  email?: string | null;
}

export function AdminDashboardShell({ children, email }: AdminDashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  // On mobile, close sidebar when navigating so the overlay doesn’t stay open
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh w-full overflow-hidden md:flex-row">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        onToggle={() => setSidebarOpen((o) => !o)}
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminNavbar
          email={email}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          sidebarOpen={sidebarOpen}
        />
        <main
          id="admin-main-content"
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-slate-100 pb-14 print:overflow-visible print:pb-0"
        >
          {children}
        </main>
        <AdminFooter sidebarOpen={sidebarOpen} />
      </div>
    </div>
  );
}
