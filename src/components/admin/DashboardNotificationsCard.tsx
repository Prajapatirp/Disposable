"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch("/api/notifications?limit=15");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function markAsRead(id: string): Promise<boolean> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  return res.ok;
}

/** Delete all notifications (clear from list). */
async function clearAllNotifications(): Promise<boolean> {
  const res = await fetch("/api/notifications", { method: "DELETE" });
  return res.ok;
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

function getLinkForNotification(item: NotificationItem): string | null {
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

export function DashboardNotificationsCard() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchNotifications();
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    const ok = await markAsRead(item._id);
    if (ok) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
    }
  };

  const handleClearAll = async () => {
    const ok = await clearAllNotifications();
    if (ok) setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-slate-50/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold sm:text-lg">Recent notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-xs font-medium text-white">
              {unreadCount} unread
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleClearAll}
          >
            Clear all
          </Button>
        )}
      </div>
      <CardContent className="p-0">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No notifications. They will appear here until you see them.
          </p>
        ) : (
          <ul className="max-h-[280px] overflow-y-auto">
            {notifications.map((item) => {
              const href = getLinkForNotification(item);
              return (
                <li key={item._id} className="border-b last:border-b-0">
                  <div
                    className={cn(
                      "flex items-start justify-between gap-2 px-4 py-3 transition-colors hover:bg-slate-50/80",
                      !item.isRead && "bg-primary/5"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn("line-clamp-2 text-sm", !item.isRead && "font-medium")}>
                        {item.message}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!item.isRead && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                          onClick={() => handleMarkAsRead(item)}
                        >
                          Mark read
                        </Button>
                      )}
                      {href && (
                        <Link
                          href={href}
                          className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-primary hover:bg-primary/10"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Show details
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
