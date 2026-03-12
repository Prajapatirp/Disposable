"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T extends { _id: string }> {
  columns: Column<T>[];
  data: T[];
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  /** Alternating row background (white / gray-50) */
  striped?: boolean;
  /** Max height for the scrollable body area (default: 60vh). Only the tbody scrolls; thead stays fixed. */
  maxHeight?: string;
}

export function DataTable<T extends { _id: string }>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  actions,
  emptyMessage = "No data found.",
  className,
  striped = false,
  maxHeight = "60vh",
}: DataTableProps<T>) {
  const isFullHeight = maxHeight === "100%";
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white",
        isFullHeight && "flex h-full min-h-0 flex-col",
        className
      )}
      style={isFullHeight ? { minHeight: 0 } : undefined}
    >
      <div
        className={cn(
          "overflow-auto overflow-x-auto",
          isFullHeight && "min-h-0 flex-1"
        )}
        style={isFullHeight ? { minHeight: 0 } : { maxHeight }}
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 border-b-2 border-gray-200 bg-gray-100 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] [&>tr]:bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  "bg-gray-100 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700",
                  col.sortable && "cursor-pointer select-none hover:bg-gray-200",
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.id)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.id && (
                    <span className="text-muted-foreground">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </span>
              </th>
            ))}
            {actions && (
              <th className="sticky top-0 z-20 min-w-[120px] bg-gray-100 pl-4 pr-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                ACTIONS
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={row._id}
                className={cn(
                  "border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-100",
                  striped && (index % 2 === 1 ? "bg-gray-50/50" : "bg-white")
                )}
              >
                {columns.map((col) => (
                  <td key={col.id} className={cn("px-4 py-3", col.className)}>
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : String((row as Record<string, unknown>)[col.accessor as string] ?? "")}
                  </td>
                ))}
                {actions && (
                  <td className="pl-4 pr-6 py-3 text-right">{actions(row)}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
