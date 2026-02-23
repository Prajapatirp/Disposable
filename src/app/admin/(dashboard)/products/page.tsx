"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DataTable,
  Column,
  Pagination,
  PageLoading,
} from "@/components/ui";
import { PrimaryButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Search, Filter, Eye } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Product {
  _id: string;
  name: string;
  category: string;
  description?: string;
  variants: { _id: string; variantName: string; quantityAvailable: number; pricePerUnit: number }[];
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProducts(data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products
    .filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = !categoryFilter || p.category === categoryFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      if (aVal === bVal) return 0;
      const dir = sortDir === "asc" ? 1 : -1;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeFiltersCount = categoryFilter ? 1 : 0;

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Product deleted");
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  }

  const columns: Column<Product>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (row) => (
        <Link
          href={`/admin/products/${row._id}`}
          className="text-left font-medium text-[#7C3AED] hover:underline"
        >
          {row.name}
        </Link>
      ),
      sortable: true,
    },
    { id: "category", header: "Category", accessor: "category", sortable: true },
    {
      id: "variants",
      header: "Variants",
      accessor: (row) => row.variants?.length ?? 0,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col p-4 sm:p-6">
      <h1 className="mb-4 shrink-0 text-2xl font-bold tracking-tight text-[#7C3AED] sm:text-3xl">
        Products
      </h1>

      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or category"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border-gray-300 bg-white pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="relative rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED] text-xs font-medium text-white">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <Link href="/admin/products/new">
            <PrimaryButton className="rounded-lg bg-[#7C3AED] hover:bg-[#7C3AED]/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </PrimaryButton>
          </Link>
        </div>
      </div>

      {filtersOpen && (
        <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <span className="text-sm font-medium text-gray-700">Category</span>
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryFilter("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <PageLoading />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-hidden">
              <DataTable
                columns={columns}
                data={paginated}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                striped
                maxHeight="100%"
                className="h-full"
                emptyMessage="No records found."
              actions={(row) => (
                <div className="flex justify-end gap-1">
                  <Link
                    href={`/admin/products/${row._id}`}
                    aria-label="View product details"
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/admin/products/${row._id}/edit`}
                    aria-label="Edit"
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(row._id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              />
            </div>
            <div className="shrink-0 border-t border-gray-200 bg-gray-50/50 px-4 py-2">
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
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
