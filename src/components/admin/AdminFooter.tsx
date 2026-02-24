"use client";

import Link from "next/link";

interface AdminFooterProps {
  sidebarOpen?: boolean;
}

export function AdminFooter(_props: AdminFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-[60] flex h-14 min-h-14 flex-shrink-0 items-center justify-between gap-4 border-t border-gray-800 bg-black px-4 sm:px-6">
      <div className="flex min-w-0 flex-shrink items-center gap-x-4 sm:gap-x-6">
        <Link
          href="#"
          className="text-xs font-medium uppercase tracking-wide text-white/90 hover:text-white sm:text-sm"
        >
          Terms and Conditions
        </Link>
        <span
          className="h-3.5 w-px flex-shrink-0 bg-gray-500"
          aria-hidden
        />
        <Link
          href="#"
          className="text-xs font-medium uppercase tracking-wide text-white/90 hover:text-white sm:text-sm"
        >
          Privacy Policy
        </Link>
      </div>
      <span className="shrink-0 text-xs text-white/80 sm:text-sm">
        Copyright © {year} Disposable Admin. All rights reserved.
      </span>
    </footer>
  );
}
