/**
 * Notification types for the admin panel.
 * Used by NotificationService and SchedulerService.
 */
export const NOTIFICATION_TYPES = [
  "LOW_STOCK",
  "DISPATCH_REMINDER",
  "BILL_PENDING",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const REFERENCE_TYPES = ["Product", "Order", "Bill"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];
