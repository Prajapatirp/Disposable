"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DataTable, Column, Filters, Pagination, PageLoading, Tooltip } from "@/components/ui";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string>("sortOrder");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = categories.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = (a as unknown as Record<string, unknown>)[sortKey];
    const bVal = (b as unknown as Record<string, unknown>)[sortKey];
    if (aVal === bVal) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * dir;
    }
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  const totalRecords = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Category deleted");
      fetchCategories();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete category");
    }
  }

  const columns: Column<Category>[] = [
    {
      id: "name",
      header: "NAME",
      accessor: (row) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
      sortable: true,
    },
    { id: "slug", header: "SLUG", accessor: "slug", sortable: true },
    {
      id: "sortOrder",
      header: "ORDER",
      accessor: "sortOrder",
      sortable: true,
    },
    {
      id: "isActive",
      header: "STATUS",
      accessor: (row) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            row.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          )}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
      sortable: true,
    },
    {
      id: "actions",
      header: "ACTIONS",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <Tooltip content="Edit">
            <Link
              href={`/admin/categories/${row._id}/edit`}
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </Tooltip>
          <Tooltip content="Delete">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => void handleDelete(row._id, row.name)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  if (loading) return <PageLoading />;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
      <div className="mb-4 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Categories
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage product categories used in the catalog and storefront.
          </p>
        </div>
        <Link href="/admin/categories/new" className={buttonVariants({ variant: "primary" })}>
          <Plus className="mr-2 h-4 w-4" />
          Add category
        </Link>
      </div>

      <Filters
        searchPlaceholder="Search categories…"
        searchValue={search}
        onSearchChange={setSearch}
        className="mb-4 shrink-0"
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <DataTable
            columns={columns}
            data={paginated}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            maxHeight="100%"
            className="h-full min-h-0 w-full rounded-none border-0 shadow-none"
            emptyMessage="No categories yet. Create one to assign products."
          />
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          className="shrink-0 rounded-b-lg border-t border-gray-200"
        />
      </div>
    </div>
  );
}
