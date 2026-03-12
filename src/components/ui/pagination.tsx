"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalRecords?: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalRecords,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className,
}: PaginationProps) {
  const showFullPagination = totalRecords !== undefined;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (page < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return Array.from(new Set(pages)).sort((a, b) => (a === "ellipsis" ? 1 : b === "ellipsis" ? -1 : (a as number) - (b as number)));
  };

  if (!showFullPagination && totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3",
        className
      )}
      aria-label="Pagination"
    >
      {/* Left: Total Records */}
      <div className="text-sm text-gray-600">
        {showFullPagination ? (
          <>
            Total Records: <span className="font-medium">{totalRecords}</span>
          </>
        ) : (
          <>Page {page} of {totalPages}</>
        )}
      </div>

      {/* Center + Right: Page numbers and Per page selector in one row */}
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex items-center gap-0.5" aria-label="Page navigation">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded"
            onClick={() => onPageChange(page - 1)}
            disabled={prevDisabled}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {showFullPagination &&
            getPageNumbers().map((p, i) =>
              p === "ellipsis" ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-gray-400">
                  ...
                </span>
              ) : (
                <Button
                  key={p}
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded text-sm",
                    page === p
                      ? "border-2 border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950/70"
                      : "border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                  )}
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={page === p ? "page" : undefined}
                >
                  {p}
                </Button>
              )
            )}
          {!showFullPagination && totalPages > 1 && (
            <span className="px-2 text-sm text-gray-600">{page}</span>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded"
            onClick={() => onPageChange(page + 1)}
            disabled={nextDisabled}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <select
              className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
