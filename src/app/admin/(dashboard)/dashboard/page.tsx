import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";
import Client from "@/lib/models/Client";
import Order from "@/lib/models/Order";
import Bill from "@/lib/models/Bill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, ShoppingCart, FileText, Eye, ChevronRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { BillAmountChart } from "@/components/admin/BillAmountChart";
import { OrderStatisticsCard } from "@/components/admin/OrderStatisticsCard";
import { DashboardNotificationsCard } from "@/components/admin/DashboardNotificationsCard";

export default async function DashboardPage() {
  await connectDB();
  const [
    productCount,
    clientCount,
    orderCount,
    billCount,
    latestOrders,
    revenueResult,
    statusCountsResult,
  ] = await Promise.all([
    Product.countDocuments(),
    Client.countDocuments(),
    Order.countDocuments(),
    Bill.countDocuments(),
    Order.find()
      .sort({ createdDate: -1 })
      .limit(10)
      .populate("clientId", "firstName lastName phoneNumber")
      .lean(),
    Order.aggregate<{ _id: null; totalRevenue: number }>([
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
    ]),
    Order.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);
  const dispatchOrders = await Order.countDocuments({ status: "Dispatch Stage" });
  const pendingBills = await Bill.countDocuments({ status: "Pending" });

  const totalRevenue = revenueResult[0]?.totalRevenue ?? 0;
  const statusCounts: Record<string, number> = {};
  statusCountsResult.forEach((row) => {
    statusCounts[row._id] = row.count;
  });
  const orderStats = {
    totalRevenue,
    totalOrders: orderCount,
    statusCounts,
  };

  const stats = [
    {
      title: "Products",
      value: productCount,
      icon: Package,
      href: "/admin/products",
      color: "bg-violet-500/10 text-violet-600",
    },
    {
      title: "Clients",
      value: clientCount,
      icon: Users,
      href: "/admin/clients",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Orders",
      value: orderCount,
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "bg-amber-500/10 text-amber-600",
      subtitle: `${dispatchOrders} in dispatch`,
    },
    {
      title: "Bills",
      value: billCount,
      icon: FileText,
      href: "/admin/billing",
      color: "bg-emerald-500/10 text-emerald-600",
      subtitle: `${pendingBills} pending`,
    },
  ];

  type PopulatedOrder = (typeof latestOrders)[number] & {
    clientId: { firstName: string; lastName: string; phoneNumber?: string } | null;
  };

  const orderAmount = (order: PopulatedOrder) =>
    order.items?.reduce((sum, i) => sum + (i.quantity ?? 0) * (i.price ?? 0), 0) ?? 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Overview of your disposable products business
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.title}
                </CardTitle>
                <span className={`shrink-0 rounded-lg p-2 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
                {s.subtitle && (
                  <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent notifications: shown until admin sees (marks as read) */}
      <div className="mt-6 sm:mt-8">
        <DashboardNotificationsCard />
      </div>

      {/* Bill performance (left) and Order Statistics (right) in one row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 lg:grid-cols-2 lg:gap-6">
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <BillAmountChart />
          </CardContent>
        </Card>
        <OrderStatisticsCard data={orderStats} />
      </div>

      {/* Recent Summary: latest 10 orders only; "View All" goes to full orders list */}
      <Card className="mt-6 overflow-hidden sm:mt-8">
        <div className="flex items-center justify-between bg-black px-4 py-3 sm:px-6">
          <h2 className="text-base font-semibold text-white sm:text-lg">
            Recent Summary
          </h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <CardContent className="p-0">
          {latestOrders.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground sm:px-6">
              No orders yet.
            </p>
          ) : (
            <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-3 font-medium sm:pl-6">
                      Client
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Contact
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Created On
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Order Amount
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Order Status
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium pr-4 sm:pr-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(latestOrders as PopulatedOrder[]).map((order) => {
                    const client = order.clientId;
                    const clientName =
                      client && typeof client === "object"
                        ? `${client.firstName} ${client.lastName}`.trim() || "—"
                        : "—";
                    const contact =
                      client && typeof client === "object" && client.phoneNumber
                        ? client.phoneNumber
                        : "—";
                    const date = order.createdDate
                      ? new Date(order.createdDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";
                    const amount = orderAmount(order);
                    const formattedAmount = amount.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    });
                    return (
                      <tr
                        key={String(order._id)}
                        className="border-b last:border-0 bg-white hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground sm:pl-6">
                          {clientName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {contact}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {date}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {formattedAmount}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 pr-4 sm:pr-6">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            aria-label={`View order ${order._id}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent hover:text-foreground"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
