"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { X } from "lucide-react";

const DRAWER_DURATION_MS = 250;
const MAIN_CONTENT_ID = "admin-main-content";
/** Match AdminFooter height (h-14) so panel stops above footer; overlay fills main to avoid a light strip */
const FOOTER_OFFSET_CLASS = "bottom-14";

export interface FilterDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Called when the drawer should close (overlay click or close button) */
  onClose: () => void;
  /** Title shown in the drawer header */
  title?: string;
  /** Drawer content. Use for filter form fields. */
  children: React.ReactNode;
  /** Which side the drawer slides in from */
  side?: "left" | "right";
  /** Width of the drawer panel */
  width?: "sm" | "md" | "lg";
  /** Optional footer (e.g. Apply / Clear buttons) */
  footer?: React.ReactNode;
  /** When true (default), drawer opens inside #admin-main-content (between navbar and footer). When false, full viewport. */
  constrainToContent?: boolean;
  className?: string;
}

const widthClasses = {
  sm: "w-full max-w-sm",
  md: "w-full max-w-md",
  lg: "w-full max-w-lg",
};

export function FilterDrawer({
  open,
  onClose,
  title = "Filters",
  children,
  side = "right",
  width = "md",
  footer,
  constrainToContent = true,
  className,
}: FilterDrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [entered, setEntered] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);
  const visible = open || exiting;

  React.useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const target =
      constrainToContent ? document.getElementById(MAIN_CONTENT_ID) : null;
    setPortalTarget(target || document.body);
  }, [constrainToContent]);

  React.useEffect(() => {
    if (open) {
      setExiting(false);
      setEntered(false);
      const start = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(start);
    }
  }, [open]);

  React.useEffect(() => {
    if (!visible) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [visible]);

  const handleClose = React.useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      onClose();
      setExiting(false);
    }, DRAWER_DURATION_MS);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!visible) return null;

  const panelTranslate = side === "right" ? "translate-x-full" : "-translate-x-full";
  const panelOpen = entered && !exiting;
  const isConstrained = portalTarget && portalTarget.id === MAIN_CONTENT_ID;
  const wrapperClass = isConstrained
    ? "absolute inset-0"
    : "fixed inset-0";

  const drawerContent = (
    <div
      className={cn("z-50 flex", wrapperClass)}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? "filter-drawer-title" : undefined}
    >
      {/* Overlay: fills full main (no gap above footer); footer sits on top via z-index */}
      <div
        className={cn(
          "bg-black/50 transition-opacity duration-200 ease-out",
          isConstrained ? "absolute inset-0" : "fixed inset-0",
          panelOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={handleOverlayClick}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "z-50 flex flex-col bg-background shadow-xl transition-transform duration-200 ease-out",
          isConstrained ? "absolute top-0" : "fixed top-0 bottom-0",
          isConstrained ? FOOTER_OFFSET_CLASS : "bottom-0",
          isConstrained ? "absolute" : "fixed",
          side === "right" ? "right-0" : "left-0",
          widthClasses[width],
          panelOpen ? "translate-x-0" : panelTranslate,
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="filter-drawer-title" className="text-lg font-semibold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="border-t border-border p-4 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== "undefined" && portalTarget) {
    return createPortal(drawerContent, portalTarget);
  }

  return drawerContent;
}
