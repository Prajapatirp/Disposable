"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DataTable,
  Column,
  Pagination,
  PageLoading,
  FilterDrawer,
  Input,
  Select,
} from "@/components/ui";
import { PrimaryButton } from "@/components/ui/button";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Filter, Eye } from "lucide-react";
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

const CATEGORY_OPTIONS = [
  { value: "", label: "All" },
  ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterOpen, setFilterOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (categoryFilter) params.set("category", categoryFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const url = `/api/products${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProducts(data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, startDate, endDate]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStartDate("");
    setEndDate("");
    setFilterOpen(false);
  };

  const applyFilters = () => {
    setFilterOpen(false);
  };

  const filtered = products;
  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginated = filtered
    .slice()
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      if (aVal === bVal) return 0;
      const dir = sortDir === "asc" ? 1 : -1;
      return String(aVal).localeCompare(String(bVal)) * dir;
    })
    .slice((page - 1) * pageSize, page * pageSize);

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
      <div className="mb-4 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[#7C3AED] sm:text-3xl">
          Products
        </h1>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="secondary"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Link href="/admin/products/new">
            <PrimaryButton className="rounded-lg bg-[#7C3AED] hover:bg-[#7C3AED]/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </PrimaryButton>
          </Link>
        </div>
      </div>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter products"
        width="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear
            </Button>
            <Button variant="primary" size="sm" onClick={applyFilters}>
              Apply
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Search"
            placeholder="Name or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All"
          />
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </FilterDrawer>

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
