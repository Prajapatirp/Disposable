"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

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

function PageSizeSelect({
  value,
  options,
  onChange,
}: {
  value: number;
  options: number[];
  onChange: (size: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex h-8 w-[4.5rem] items-center justify-between rounded border bg-white px-2 text-sm text-gray-900 transition-colors",
          open
            ? "border-primary ring-2 ring-primary/15"
            : "border-gray-300 hover:border-gray-400"
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Rows per page"
      >
        <span className="tabular-nums">{value}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform duration-200",
            open && "-rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Rows per page options"
          className="absolute bottom-[calc(100%+4px)] right-0 z-50 w-[4.5rem] overflow-hidden rounded border border-gray-300 bg-white py-0.5 shadow-lg"
        >
          {options.map((n) => {
            const selected = n === value;
            return (
              <li key={n} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-center px-2 py-1.5 text-sm tabular-nums transition-colors",
                    selected
                      ? "bg-primary font-medium text-white"
                      : "text-gray-800 hover:bg-gray-100"
                  )}
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                >
                  {n}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (page <= 3) {
    pages.push(2, 3, "ellipsis", totalPages);
  } else if (page >= totalPages - 2) {
    pages.push("ellipsis", totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push("ellipsis", page, "ellipsis", totalPages);
  }

  return pages;
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
  const nextDisabled = page >= totalPages || totalPages === 0;

  if (!showFullPagination && totalPages <= 1) return null;

  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div
      className={cn(
        "relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-4 py-3",
        className
      )}
      aria-label="Pagination"
    >
      <div className="text-sm text-gray-600">
        {showFullPagination ? (
          <>
            Total <span className="font-semibold text-gray-900">{totalRecords}</span>
          </>
        ) : (
          <>
            Page <span className="font-semibold text-gray-900">{page}</span> of{" "}
            <span className="font-semibold text-gray-900">{totalPages}</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-5">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page</span>
            <PageSizeSelect
              value={pageSize}
              options={pageSizeOptions}
              onChange={onPageSizeChange}
            />
          </div>
        )}

        <nav className="flex items-center gap-1" aria-label="Page navigation">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
            onClick={() => onPageChange(page - 1)}
            disabled={prevDisabled}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {showFullPagination &&
            getPageNumbers(page, safeTotalPages).map((p, i) =>
              p === "ellipsis" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-sm text-gray-500"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={cn(
                    "inline-flex h-8 min-w-8 items-center justify-center text-sm transition-colors",
                    page === p
                      ? "rounded-full bg-gray-900 font-medium text-white"
                      : "rounded-md text-gray-700 hover:bg-gray-200/70 hover:text-gray-900"
                  )}
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={page === p ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}

          {!showFullPagination && totalPages > 1 && (
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">
              {page}
            </span>
          )}

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
            onClick={() => onPageChange(page + 1)}
            disabled={nextDisabled}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
