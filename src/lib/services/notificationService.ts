import mongoose from "mongoose";
import Notification from "@/lib/models/Notification";
import type { NotificationType, ReferenceType } from "@/lib/constants/notifications";

export interface CreateNotificationInput {
  type: NotificationType;
  message: string;
  referenceId: mongoose.Types.ObjectId;
  referenceType: ReferenceType;
}

/**
 * NotificationService: create, mark read, and query notifications.
 * Prevents duplicates by checking referenceId + type for an existing unread notification.
 */
export const NotificationService = {
  /**
   * Create a notification if no active (unread) one exists for the same referenceId + type.
   * Returns the created notification or null if duplicate.
   */
  async createNotification(input: CreateNotificationInput) {
    const exists = await Notification.findOne({
      referenceId: input.referenceId,
      type: input.type,
      isRead: false,
    });
    if (exists) return null;

    const doc = await Notification.create({
      type: input.type,
      message: input.message,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      isRead: false,
    });
    return doc.toObject();
  },

  async markAsRead(notificationId: string) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) return null;
    const doc = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
    return doc ? doc.toObject() : null;
  },

  /** Mark all notifications as read (clear unread). Returns count updated. */
  async markAllAsRead(): Promise<number> {
    const result = await Notification.updateMany(
      { isRead: false },
      { $set: { isRead: true } }
    );
    return result.modifiedCount;
  },

  /** Delete all notifications (clear from dropdown and recent list). Returns count deleted. */
  async deleteAll(): Promise<number> {
    const result = await Notification.deleteMany({});
    return result.deletedCount;
  },

  async getUnreadCount(): Promise<number> {
    return Notification.countDocuments({ isRead: false });
  },

  /**
   * Get all notifications, newest first. Optional limit for dropdown.
   */
  async getAllNotifications(limit = 50) {
    const list = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return list;
  },
};
