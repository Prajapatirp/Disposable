import mongoose from "mongoose";
import { NOTIFICATION_TYPES, REFERENCE_TYPES } from "../constants/notifications";

export type { NotificationType, ReferenceType } from "../constants/notifications";

export interface INotification {
  _id: mongoose.Types.ObjectId;
  type: string;
  message: string;
  referenceId: mongoose.Types.ObjectId;
  referenceType: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new mongoose.Schema<INotification>(
  {
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    message: { type: String, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    referenceType: { type: String, required: true, enum: REFERENCE_TYPES },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for efficient queries: unread count, filter by type, sort by date
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ createdAt: -1 });
// Prevent duplicate active notifications: same reference + type (unread)
NotificationSchema.index({ referenceId: 1, type: 1, isRead: 1 });

export default (mongoose.models?.Notification as mongoose.Model<INotification>) ||
  mongoose.model<INotification>("Notification", NotificationSchema);
