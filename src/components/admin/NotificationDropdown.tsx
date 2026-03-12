"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getDetailsLink(item: NotificationItem): string | null {
  switch (item.referenceType) {
    case "Product":
      return `/admin/products/${item.referenceId}`;
    case "Order":
      return `/admin/orders/${item.referenceId}`;
    case "Bill":
      return `/admin/billing/bill/${item.referenceId}`;
    default:
      return null;
  }
}

export type NotificationItem = {
  _id: string;
  type: string;
  message: string;
  referenceId: string;
  referenceType: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

const POLL_INTERVAL_MS = 30 * 1000;

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch("/api/notifications/unread-count");
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data.count === "number" ? data.count : 0;
}

async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch("/api/notifications?limit=20");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function markAsRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
}

/** Delete all notifications (clear from list). */
async function clearAllNotifications(): Promise<boolean> {
  const res = await fetch("/api/notifications", { method: "DELETE" });
  return res.ok;
}

export function NotificationDropdown() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningChecks, setRunningChecks] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadUnreadCount = useCallback(async () => {
    const count = await fetchUnreadCount();
    setUnreadCount(count);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchNotifications();
      setNotifications(list);
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    pollRef.current = setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleNotificationClick = async (item: NotificationItem) => {
    if (item.isRead) return;
    await markAsRead(item._id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleClearAll = async () => {
    const ok = await clearAllNotifications();
    if (ok) {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  /** Run notification checks (low stock, dispatch, pending bills). Use in dev when cron is not running. */
  const runChecksNow = async () => {
    setRunningChecks(true);
    try {
      const res = await fetch("/api/cron/run-notifications");
      if (res.ok) {
        await loadNotifications();
      }
    } finally {
      setRunningChecks(false);
    }
  };

  const badgeLabel = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${badgeLabel ? `, ${badgeLabel} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {badgeLabel !== null && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white"
            aria-hidden
          >
            {badgeLabel}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              onClick={runChecksNow}
              disabled={runningChecks}
            >
              {runningChecks ? "Running…" : "Run checks"}
            </Button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                Loading...
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                No notifications
              </p>
            ) : (
              <>
                {notifications.length > 0 && (
                  <div className="border-b border-gray-100 px-4 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      onClick={handleClearAll}
                    >
                      Clear all
                    </Button>
                  </div>
                )}
                <ul className="py-1">
                {notifications.map((item) => {
                  const detailsHref = getDetailsLink(item);
                  return (
                    <li key={item._id} className="border-b border-gray-100 last:border-b-0">
                      <div
                        className={cn(
                          "flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50",
                          !item.isRead && "bg-primary/5"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(item)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className={cn(
                            "text-sm leading-snug text-gray-900 break-words",
                            item.isRead && "text-gray-500"
                          )}>
                            {item.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatDate(item.createdAt)}
                          </p>
                        </button>
                        {detailsHref && (
                          <Link
                            href={detailsHref}
                            className="shrink-0 self-start rounded px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="inline-flex items-center gap-1">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Details
                            </span>
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}
