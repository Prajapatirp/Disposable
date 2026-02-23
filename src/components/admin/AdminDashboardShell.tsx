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
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        onToggle={() => setSidebarOpen((o) => !o)}
      />
      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminNavbar
          email={email}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          sidebarOpen={sidebarOpen}
        />
        <main className="min-h-0 flex-1 overflow-hidden bg-slate-100 pb-14">
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            {children}
          </div>
        </main>
        <AdminFooter sidebarOpen={sidebarOpen} />
      </div>
    </div>
  );
}
