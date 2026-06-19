"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "full";
  /**
   * Pinned below the scrollable body so actions stay visible (e.g. Done / Submit).
   */
  footer?: React.ReactNode;
  /**
   * Called before closing when the dimmed backdrop is clicked.
   * Return false to keep the modal open (e.g. to ignore the stray click that
   * some browsers fire on the backdrop right after a native file picker closes).
   */
  shouldCloseOnBackdropClick?: () => boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  full: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "md",
  footer,
  shouldCloseOnBackdropClick,
}: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => {
          if (shouldCloseOnBackdropClick && !shouldCloseOnBackdropClick()) return;
          onClose();
        }}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-50 flex w-full max-h-[min(92dvh,880px)] flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-lg",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-5 pb-3 pt-5 sm:px-6">
          <h2 id="modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="sr-only">Close</span>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4 sm:px-6",
            footer ? "pb-3" : "pb-5"
          )}
        >
          {children}
        </div>
        {footer != null ? (
          <div className="shrink-0 border-t bg-card px-5 py-3 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
