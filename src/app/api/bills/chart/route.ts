import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Bill from "@/lib/models/Bill";
import { requireAuth } from "@/lib/api-auth";
import type { PipelineStage } from "mongoose";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type GroupBy = "week" | "month" | "year" | "custom";

function getStartEnd(groupBy: GroupBy, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  if (groupBy === "custom" && startDate && endDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }
  if (groupBy === "week") {
    // Last 7 days – chart shows day-by-day
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (groupBy === "month") {
    console.log("month", start.getDate());
    // Last 30 days – chart shows day-by-day
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  // year: current calendar year – chart shows month-by-month
  start.setFullYear(start.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const groupBy = (searchParams.get("groupBy") || "week") as GroupBy;
    if (!["week", "month", "year", "custom"].includes(groupBy)) {
      return NextResponse.json({ error: "Invalid groupBy" }, { status: 400 });
    }
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    if (groupBy === "custom" && (!startDate || !endDate)) {
      return NextResponse.json({ error: "startDate and endDate required for custom" }, { status: 400 });
    }

    const { start, end } = getStartEnd(groupBy, startDate, endDate);

    if (groupBy === "custom") {
      const pipeline: PipelineStage[] = [
        { $match: { billDate: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$billDate" } },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ];
      const raw = await Bill.aggregate(pipeline);
      const data = raw.map((row: { _id: string; total: number }) => ({
        period: row._id,
        amount: row.total,
      }));
      return NextResponse.json(data);
    }

    if (groupBy === "week") {
      // Day-by-day for last 7 days
      const raw = await Bill.aggregate([
        { $match: { billDate: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$billDate" } },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      const byDay: Record<string, number> = {};
      raw.forEach((row: { _id: string; total: number }) => {
        byDay[row._id] = row.total;
      });
      const data: { period: string; amount: number }[] = [];
      const d = new Date(start);
      while (d <= end) {
        const key = d.toISOString().slice(0, 10);
        data.push({
          period: key,
          amount: byDay[key] ?? 0,
        });
        d.setDate(d.getDate() + 1);
      }
      return NextResponse.json(data);
    }

    if (groupBy === "month") {
      // Day-by-day for last 30 days
      const raw = await Bill.aggregate([
        { $match: { billDate: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$billDate" } },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      const byDay: Record<string, number> = {};
      raw.forEach((row: { _id: string; total: number }) => {
        byDay[row._id] = row.total;
      });
      const data: { period: string; amount: number }[] = [];
      const d = new Date(start);
      while (d <= end) {
        const key = d.toISOString().slice(0, 10);
        data.push({
          period: key,
          amount: byDay[key] ?? 0,
        });
        d.setDate(d.getDate() + 1);
      }
      return NextResponse.json(data);
    }

    // year: month-by-month for current year
    const raw = await Bill.aggregate([
      { $match: { billDate: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            year: { $year: "$billDate" },
            month: { $month: "$billDate" },
          },
          total: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const byMonth: Record<string, number> = {};
    raw.forEach(
      (row: { _id: { year: number; month: number }; total: number }) => {
        const key = `${row._id.year}-${row._id.month}`;
        byMonth[key] = row.total;
      }
    );
    const year = end.getFullYear();
    const data: { period: string; amount: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${m}`;
      data.push({
        period: MONTH_NAMES[m - 1],
        amount: byMonth[key] ?? 0,
      });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
