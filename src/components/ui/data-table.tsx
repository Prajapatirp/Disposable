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
  /**
   * Max height for the scrollable body (default: 60vh).
   * Use "100%" when the parent is a flex column with a bounded height.
   */
  maxHeight?: string;
}

const thClass =
  "bg-gray-100 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700";

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
    >
      <div
        className={cn(
          "overflow-x-auto overflow-y-auto overscroll-y-contain",
          isFullHeight ? "min-h-0 flex-1" : ""
        )}
        style={isFullHeight ? { minHeight: 0 } : { maxHeight }}
      >
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 border-b-2 border-gray-200 bg-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    thClass,
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
                <th className={cn(thClass, "min-w-[120px] pr-6 text-right")}>ACTIONS</th>
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
                    "border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50",
                    striped && (index % 2 === 1 ? "bg-gray-50/50" : "bg-white")
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.id} className={cn("px-4 py-3 align-top", col.className)}>
                      {typeof col.accessor === "function"
                        ? col.accessor(row)
                        : String((row as Record<string, unknown>)[col.accessor as string] ?? "")}
                    </td>
                  ))}
                  {actions && (
                    <td className="whitespace-nowrap py-3 pl-4 pr-6 text-right align-top">
                      {actions(row)}
                    </td>
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
