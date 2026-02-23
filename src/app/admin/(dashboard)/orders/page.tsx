"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DataTable,
  Column,
  Filters,
  Pagination,
  PageLoading,
  StatusBadge,
} from "@/components/ui";
import { Button, PrimaryButton, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface OrderItem {
  productId: { _id: string; name: string } | string;
  variantId: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  clientId: { _id: string; firstName: string; lastName: string; phoneNumber?: string } | string;
  items: OrderItem[];
  status: string;
  createdDate: string;
  hasBill?: boolean;
}

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Dispatch Stage", label: "Dispatch Stage" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/orders?status=${encodeURIComponent(statusFilter)}`
        : "/api/orders";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const clientName = (o: Order) => {
    const c = o.clientId;
    if (typeof c === "object" && c) return `${c.firstName} ${c.lastName}`;
    return "—";
  };

  const filtered = orders.filter((o) => {
    const name = clientName(o).toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function markCompleted(id: string) {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Order marked as completed");
      fetchOrders();
    } catch {
      toast.error("Failed to update order");
    }
  }

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order? It will be marked as Cancelled.")) return;
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Order cancelled");
      fetchOrders();
    } catch {
      toast.error("Failed to cancel order");
    }
  }

  const totalAmount = (o: Order) =>
    o.items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  const columns: Column<Order>[] = [
    {
      id: "client",
      header: "Client",
      accessor: (row) => clientName(row),
    },
    {
      id: "items",
      header: "Items",
      accessor: (row) => row.items.length,
    },
    {
      id: "total",
      header: "Total",
      accessor: (row) => `₹${totalAmount(row).toLocaleString()}`,
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} type="order" />,
    },
    {
      id: "createdDate",
      header: "Date",
      accessor: (row) =>
        new Date(row.createdDate).toLocaleDateString(),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Create and manage client orders</p>
        </div>
        <Link href="/admin/orders/new" className={buttonVariants({ variant: "primary" })}>
          Create Order
        </Link>
      </div>

      <div className="mb-4">
        <Filters
          searchPlaceholder="Search by client..."
          searchValue={search}
          onSearchChange={setSearch}
          dropdownLabel="Status"
          dropdownOptions={STATUS_OPTIONS}
          dropdownValue={statusFilter}
          onDropdownChange={setStatusFilter}
          onClear={() => {
            setSearch("");
            setStatusFilter("");
          }}
        />
      </div>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginated}
            actions={(row) => (
              <div className="flex flex-col items-end gap-2">
                {row.status === "Dispatch Stage" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markCompleted(row._id)}
                    className="w-full sm:w-auto"
                  >
                    Mark completed
                  </Button>
                )}
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/admin/orders/${row._id}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="View order"
                      className="rounded-lg text-[#7C3AED] transition-colors hover:bg-[#7C3AED]/15 hover:text-[#7C3AED]"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {!row.hasBill && (
                    <Link
                      href={`/admin/orders/${row._id}/edit`}
                      aria-label="Edit order"
                      className={buttonVariants({ variant: "ghost", size: "icon" }) + " rounded-lg text-foreground transition-colors hover:bg-[#7C3AED]/15 hover:text-[#7C3AED]"}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                  {row.status === "Dispatch Stage" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelOrder(row._id)}
                      aria-label="Cancel order"
                      className="rounded-lg text-destructive transition-colors hover:bg-destructive/15 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
