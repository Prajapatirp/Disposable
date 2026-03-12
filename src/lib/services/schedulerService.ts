import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";
import Order from "@/lib/models/Order";
import Bill from "@/lib/models/Bill";
import { NotificationService } from "./notificationService";

const LOW_STOCK_THRESHOLD = 10;

/**
 * SchedulerService: runs business-rule checks and creates notifications.
 * Called by cron (e.g. GET /api/cron/run-notifications).
 * - checkLowStock: every 5 min (testing) / production as needed
 * - checkDispatchOrders: every 1 min (testing) / change to 24h in production
 * - checkPendingBills: daily at 00:00 (0 0 * * *)
 */
export const SchedulerService = {
  /**
   * Low stock: any product with at least one variant where quantityAvailable < 10.
   * One notification per product; only if not already active (unread same referenceId + type).
   */
  async checkLowStock(): Promise<{ created: number }> {
    await connectDB();
    const products = await Product.find().lean();
    let created = 0;
    for (const product of products) {
      const hasLowStock = product.variants?.some(
        (v: { quantityAvailable?: number }) => (v.quantityAvailable ?? 0) < LOW_STOCK_THRESHOLD
      );
      if (!hasLowStock) continue;
      const result = await NotificationService.createNotification({
        type: "LOW_STOCK",
        message: `Product ${product.name} stock is below ${LOW_STOCK_THRESHOLD}. Please update quantity.`,
        referenceId: product._id,
        referenceType: "Product",
      });
      if (result) created++;
    }
    return { created };
  },

  /**
   * Dispatch reminder: orders with status "Dispatch Stage".
   * One notification per order. In production, change cron to run every 24 hours.
   */
  async checkDispatchOrders(): Promise<{ created: number }> {
    await connectDB();
    const orders = await Order.find({ status: "Dispatch Stage" }).lean();
    let created = 0;
    for (const order of orders) {
      const orderId = order.orderNumber || String(order._id);
      const result = await NotificationService.createNotification({
        type: "DISPATCH_REMINDER",
        message: `Order #${orderId} is in dispatch. Please confirm.`,
        referenceId: order._id,
        referenceType: "Order",
      });
      if (result) created++;
    }
    return { created };
  },

  /**
   * Pending bill reminder: bills with status "Pending".
   * One notification per bill. Run daily at 00:00 (0 0 * * *).
   */
  async checkPendingBills(): Promise<{ created: number }> {
    await connectDB();
    const bills = await Bill.find({ status: "Pending" }).lean();
    let created = 0;
    for (const bill of bills) {
      const billId = bill.billNumber || String(bill._id);
      const result = await NotificationService.createNotification({
        type: "BILL_PENDING",
        message: `Bill #${billId} is pending. Please complete payment.`,
        referenceId: bill._id,
        referenceType: "Bill",
      });
      if (result) created++;
    }
    return { created };
  },

  /** Run all checks. Used by cron endpoint. */
  async runAll(): Promise<{
    lowStock: number;
    dispatchReminder: number;
    pendingBills: number;
  }> {
    const [lowStock, dispatchReminder, pendingBills] = await Promise.all([
      this.checkLowStock(),
      this.checkDispatchOrders(),
      this.checkPendingBills(),
    ]);
    return {
      lowStock: lowStock.created,
      dispatchReminder: dispatchReminder.created,
      pendingBills: pendingBills.created,
    };
  },
};
