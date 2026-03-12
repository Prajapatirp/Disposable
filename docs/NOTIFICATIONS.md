# Notification System

## Folder structure

```
src/
├── lib/
│   ├── constants/
│   │   └── notifications.ts    # NOTIFICATION_TYPES, REFERENCE_TYPES
│   ├── models/
│   │   └── Notification.ts     # Mongoose schema + indexes
│   └── services/
│       ├── notificationService.ts  # create, markAsRead, getUnreadCount, getAllNotifications
│       └── schedulerService.ts     # checkLowStock, checkDispatchOrders, checkPendingBills
├── app/api/
│   ├── notifications/
│   │   ├── route.ts            # GET /api/notifications
│   │   ├── unread-count/
│   │   │   └── route.ts         # GET /api/notifications/unread-count
│   │   └── [id]/read/
│   │       └── route.ts        # PATCH /api/notifications/:id/read
│   └── cron/
│       └── run-notifications/
│           └── route.ts        # GET /api/cron/run-notifications (?check=...)
└── components/admin/
    ├── NotificationDropdown.tsx  # Bell + badge + dropdown
    └── AdminNavbar.tsx           # Uses NotificationDropdown
vercel.json                        # Cron: /api/cron/run-notifications every 12 hours
```

## Logic flow

1. **Cron** (on Vercel) calls `GET /api/cron/run-notifications` on schedule. **In local dev, cron does not run** — use the **"Run checks"** button in the notification dropdown to run the same checks manually.
2. **SchedulerService** runs the selected checks and calls **NotificationService.createNotification()** for each candidate.
3. **createNotification()** skips if an unread notification with the same `referenceId` + `type` already exists (no duplicates).
4. **Navbar**: **NotificationDropdown** fetches unread count and list, shows badge (99+ when > 99), dropdown with latest notifications; click marks as read and refreshes count. Polls unread count every 30 seconds.

## Business rules

| Rule              | Condition                    | Type               | Schedule (production)     |
|-------------------|-----------------------------|--------------------|----------------------------|
| Low stock         | Any variant stock < 10      | LOW_STOCK          | Every 5 min               |
| Dispatch reminder | order.status = "Dispatch Stage" | DISPATCH_REMINDER | Every 24h (1 min for testing) |
| Pending bill      | bill.status = "Pending"     | BILL_PENDING       | Daily 00:00               |

## API

- `GET /api/notifications?limit=50` – list notifications (newest first). Auth required.
- `GET /api/notifications/unread-count` – `{ count }`. Auth required.
- `PATCH /api/notifications/:id/read` – mark one as read. Auth required.
- `GET /api/cron/run-notifications` – run checks. Optional `Authorization: Bearer <CRON_SECRET>`.

## Cron (Vercel)

`vercel.json` runs `/api/cron/run-notifications` every 12 hours (`0 */12 * * *` — at 00:00 and 12:00 UTC).
