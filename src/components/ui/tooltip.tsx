"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "absolute z-50 overflow-hidden rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 pointer-events-none whitespace-nowrap",
          side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-1",
          side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-1",
          side === "left" && "right-full top-1/2 -translate-y-1/2 mr-1",
          side === "right" && "left-full top-1/2 -translate-y-1/2 ml-1"
        )}
      >
        {content}
      </span>
    </span>
  );
}
