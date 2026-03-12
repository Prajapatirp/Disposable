"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { SlidersHorizontal, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type BillAmountChartItem = {
  period: string;
  amount: number;
};

const GROUP_OPTIONS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
] as const;

type GroupBy = (typeof GROUP_OPTIONS)[number]["value"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

function getDefaultCustomRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatRangeLabel(date: Date): string {
  const d = date.getDate();
  const m = MONTH_SHORT[date.getMonth()];
  const y = date.getFullYear();
  return `${m}-${String(d).padStart(2, "0")}-${y}`;
}

function getDisplayDateRange(
  groupBy: GroupBy,
  customStart: string,
  customEnd: string
): string {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  if (groupBy === "custom" && customStart && customEnd) {
    return `${formatRangeLabel(new Date(customStart))} - ${formatRangeLabel(new Date(customEnd))}`;
  }
  if (groupBy === "week") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return `${formatRangeLabel(start)} - ${formatRangeLabel(end)}`;
  }
  if (groupBy === "month") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return `${formatRangeLabel(start)} - ${formatRangeLabel(end)}`;
  }
  start.setFullYear(start.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);
  const endYear = new Date(end.getFullYear(), 11, 31);
  return `${formatRangeLabel(start)} - ${formatRangeLabel(endYear)}`;
}

export function BillAmountChart() {
  const [groupBy, setGroupBy] = useState<GroupBy>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<BillAmountChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("groupBy", groupBy);
      if (groupBy === "custom" && customStart && customEnd) {
        params.set("startDate", customStart);
        params.set("endDate", customEnd);
      }
      const res = await fetch(`/api/bills/chart?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [groupBy, customStart, customEnd]);

  useEffect(() => {
    if (groupBy === "custom" && (!customStart || !customEnd)) {
      setLoading(false);
      setData([]);
      return;
    }
    fetchData();
  }, [groupBy, customStart, customEnd, fetchData]);

  useEffect(() => {
    if (groupBy === "custom" && !customStart && !customEnd) {
      const { start, end } = getDefaultCustomRange();
      setCustomStart(start);
      setCustomEnd(end);
    }
  }, [groupBy]);

  const applyCustom = () => {
    if (groupBy === "custom" && customStart && customEnd) {
      fetchData();
      setFilterModalOpen(false);
    }
  };

  const selectGroupBy = (value: GroupBy) => {
    setGroupBy(value);
    if (value !== "custom") setFilterModalOpen(false);
  };

  const popupRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!filterModalOpen || !filterButtonRef.current) return;
    const btn = filterButtonRef.current;
    const rect = btn.getBoundingClientRect();
    setPopupPosition({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, [filterModalOpen]);

  useEffect(() => {
    if (!filterModalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterModalOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current?.contains(target) ||
        filterButtonRef.current?.contains(target)
      )
        return;
      setFilterModalOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterModalOpen]);

  const displayRange = getDisplayDateRange(groupBy, customStart, customEnd);

  const popupContent = filterModalOpen && typeof document !== "undefined" && (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={() => setFilterModalOpen(false)}
      />
      <div
        ref={popupRef}
        style={{
          position: "fixed",
          top: popupPosition.top,
          right: popupPosition.right,
          zIndex: 50,
        }}
        className="w-[320px] rounded-lg border border-border bg-card p-4 shadow-lg"
        role="dialog"
        aria-label="Filter by period"
      >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {GROUP_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={groupBy === opt.value ? "primary" : "outline"}
                    size="sm"
                    onClick={() => selectGroupBy(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              {groupBy === "custom" && (
                <>
                  <div className="space-y-3 border-t border-border pt-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        From Date (MM/DD/YYYY) <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full"
                        aria-required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        To Date (MM/DD/YYYY) <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full"
                        aria-required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-border pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const { start, end } = getDefaultCustomRange();
                        setCustomStart(start);
                        setCustomEnd(end);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={applyCustom}
                      disabled={!customStart || !customEnd}
                    >
                      Submit
                    </Button>
                  </div>
                </>
              )}
            </div>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Bill Performance</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{displayRange}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            View billing
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Button
            ref={filterButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFilterModalOpen((o) => !o);
            }}
            aria-label="Filter by period"
            aria-expanded={filterModalOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {filterModalOpen &&
        typeof document !== "undefined" &&
        createPortal(popupContent, document.body)}

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : !data.length ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No bill data to display.
        </p>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1e5
                    ? `${(v / 1e5).toFixed(0)}L`
                    : v >= 1e3
                      ? `${(v / 1e3).toFixed(0)}K`
                      : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number | undefined) => [
                  value != null ? formatCurrency(value) : "—",
                  "Amount",
                ]}
                labelFormatter={(label) => label}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Bill amount"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
