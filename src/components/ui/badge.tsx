"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        dispatch:
          "border-transparent bg-amber-500/20 text-amber-700 dark:text-amber-400",
        completed:
          "border-transparent bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
        pending:
          "border-transparent bg-amber-500/20 text-amber-700 dark:text-amber-400",
        paid:
          "border-transparent bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
        cancelled:
          "border-transparent bg-muted text-muted-foreground",
        returned:
          "border-transparent bg-blue-500/20 text-blue-700 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

export function StatusBadge({
  status,
  type = "order",
}: {
  status: string;
  type?: "order" | "bill";
}) {
  const variant =
    type === "bill"
      ? status === "Paid"
        ? "paid"
        : "pending"
      : status === "Completed"
        ? "completed"
        : status === "Returned"
          ? "returned"
          : status === "Cancelled"
            ? "cancelled"
            : "dispatch";
  return <Badge variant={variant}>{status}</Badge>;
}
