"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ORDER_STATUSES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_LABELS: Record<string, string> = {
  "Dispatch Stage": "Pending",
  Completed: "Delivered",
  Returned: "Returned",
  Cancelled: "Canceled",
};

const STATUS_COLORS: Record<string, string> = {
  "Dispatch Stage": "hsl(199, 89%, 48%)",   // light blue
  Completed: "hsl(142, 76%, 36%)",         // green
  Returned: "hsl(38, 92%, 50%)",           // amber
  Cancelled: "hsl(221, 83%, 53%)",         // blue
};

export type OrderStats = {
  totalRevenue: number;
  totalOrders: number;
  statusCounts: Record<string, number>;
};

type Props = {
  data: OrderStats;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function OrderStatisticsCard({ data }: Props) {
  const { totalRevenue, totalOrders, statusCounts } = data;

  const chartData = ORDER_STATUSES.map((status) => ({
    name: STATUS_LABELS[status] ?? status,
    value: statusCounts[status] ?? 0,
    status,
  })).filter((d) => d.value > 0);

  const totalFromChart = chartData.reduce((s, d) => s + d.value, 0);
  const showChart = totalFromChart > 0;

  return (
    <Card className="overflow-hidden border-gray-800 bg-black">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-white sm:text-lg">
          Order Statistics
        </h2>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <CardContent className="border-0 bg-black p-4 text-white sm:p-6">
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">
              Total Revenue
            </p>
            <p className="text-xl font-bold text-white sm:text-2xl">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">
              Total Orders
            </p>
            <p className="text-xl font-bold text-white sm:text-2xl">
              {totalOrders}
            </p>
          </div>
        </div>

        {showChart ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
            <div className="h-[200px] w-full min-w-[200px] sm:w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    startAngle={180}
                    endAngle={0}
                    paddingAngle={2}
                    label={({ name, value }) => `${value}`}
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? "hsl(var(--muted))"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name ?? ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2">
              {chartData.map((entry) => (
                <div
                  key={entry.status}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-white/90">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[entry.status],
                      }}
                    />
                    {entry.name}
                  </span>
                  <span className="font-medium text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-white/60">
            No orders yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
