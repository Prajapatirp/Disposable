"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Select, type SelectOption } from "./select";
import { Button } from "./button";

interface FiltersProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  dropdownLabel?: string;
  dropdownOptions?: SelectOption[];
  dropdownValue?: string;
  onDropdownChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function Filters({
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  dropdownLabel,
  dropdownOptions = [],
  dropdownValue = "",
  onDropdownChange,
  onClear,
  className,
  children,
}: FiltersProps) {
  const hasFilters =
    searchValue ||
    (dropdownValue && dropdownOptions.length > 0);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3",
        className
      )}
    >
      {onSearchChange && (
        <div className="min-w-[200px] flex-1 sm:max-w-xs">
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
      )}
      {dropdownLabel && dropdownOptions.length > 0 && onDropdownChange && (
        <div className="w-full sm:w-[180px]">
          <Select
            label={dropdownLabel}
            options={dropdownOptions}
            value={dropdownValue}
            onChange={onDropdownChange}
            placeholder="All"
          />
        </div>
      )}
      {children}
      {onClear && hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
