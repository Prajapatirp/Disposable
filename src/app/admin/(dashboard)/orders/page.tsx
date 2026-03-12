"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DataTable,
  Column,
  Pagination,
  PageLoading,
  StatusBadge,
  FilterDrawer,
  Input,
  Select,
  Tooltip,
} from "@/components/ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, Filter, RotateCcw } from "lucide-react";

interface OrderItem {
  productId: { _id: string; name: string } | string;
  variantId: string;
  quantity: number;
  price: number;
  returnedQuantity?: number;
}

interface Order {
  _id: string;
  orderNumber?: string;
  clientId: { _id: string; firstName: string; lastName: string; phoneNumber?: string } | string;
  items: OrderItem[];
  status: string;
  createdDate: string;
  hasBill?: boolean;
  billPaid?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Dispatch Stage", label: "Dispatch Stage" },
  { value: "Completed", label: "Completed" },
  { value: "Returned", label: "Returned" },
  { value: "Cancelled", label: "Cancelled" },
];

interface ClientOption {
  _id: string;
  firstName: string;
  lastName: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [clientIdFilter, setClientIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (clientIdFilter) params.set("clientId", clientIdFilter);
      if (orderIdFilter.trim()) params.set("orderId", orderIdFilter.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const url = `/api/orders${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientIdFilter, orderIdFilter, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (filterOpen && clients.length === 0) {
      fetch("/api/clients")
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? setClients(data) : setClients([])))
        .catch(() => setClients([]));
    }
  }, [filterOpen, clients.length]);

  const clientName = (o: Order) => {
    const c = o.clientId;
    if (typeof c === "object" && c) return `${c.firstName} ${c.lastName}`;
    return "—";
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setOrderIdFilter("");
    setClientIdFilter("");
    setStatusFilter("");
    setFilterOpen(false);
  };

  const applyFilters = () => {
    setFilterOpen(false);
  };

  const filtered = orders;
  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order? It will be marked as Cancelled.")) return;
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
      toast.success("Order cancelled");
      fetchOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel order");
    }
  }

  const totalAmount = (o: Order) =>
    o.items.reduce(
      (sum, i) => sum + (i.quantity - (i.returnedQuantity ?? 0)) * i.price,
      0
    );

  const orderIdDisplay = (o: Order) =>
    `Order #${o.orderNumber ?? o._id.slice(-6)} -`;

  const columns: Column<Order>[] = [
    {
      id: "orderId",
      header: "ORDER ID",
      accessor: (row) => orderIdDisplay(row),
    },
    {
      id: "client",
      header: "CLIENT",
      accessor: (row) => clientName(row),
    },
    {
      id: "items",
      header: "ITEMS",
      accessor: (row) => row.items.length,
    },
    {
      id: "total",
      header: "TOTAL",
      accessor: (row) => `₹${totalAmount(row).toLocaleString()}`,
    },
    {
      id: "status",
      header: "STATUS",
      accessor: (row) => <StatusBadge status={row.status} type="order" />,
    },
    {
      id: "createdDate",
      header: "DATE",
      accessor: (row) =>
        new Date(row.createdDate).toLocaleDateString(),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
      <div className="mb-4 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Orders</h1>
          <p className="text-muted-foreground">Create and manage client orders</p>
        </div>
        <Link href="/admin/orders/new" className={buttonVariants({ variant: "primary" })}>
          Create Order
        </Link>
      </div>

      <div className="mb-4 shrink-0 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterOpen(true)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter orders"
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
          <Input
            label="Order ID"
            placeholder="e.g. last 6 characters"
            value={orderIdFilter}
            onChange={(e) => setOrderIdFilter(e.target.value)}
          />
          <Select
            label="Client"
            options={[
              { value: "", label: "All" },
              ...clients.map((c) => ({
                value: c._id,
                label: `${c.firstName} ${c.lastName}`,
              })),
            ]}
            value={clientIdFilter}
            onChange={setClientIdFilter}
            placeholder="All"
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All"
          />
        </div>
      </FilterDrawer>

      {loading ? (
        <PageLoading />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="relative min-h-0 flex-1 overflow-hidden" style={{ minHeight: 200 }}>
            <DataTable
              columns={columns}
              data={paginated}
              className="h-full min-h-0 w-full flex-1 rounded-none border-0 shadow-none"
              maxHeight="100%"
              actions={(row) => (
                <div className="flex items-center justify-end gap-1">
                  <Tooltip content="View order" side="left">
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
                  </Tooltip>
                  {!row.hasBill && (
                    <Tooltip content="Edit order" side="left">
                      <Link
                        href={`/admin/orders/${row._id}/edit`}
                        aria-label="Edit order"
                        className={buttonVariants({ variant: "ghost", size: "icon" }) + " rounded-lg text-foreground transition-colors hover:bg-[#7C3AED]/15 hover:text-[#7C3AED]"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Tooltip>
                  )}
                  {row.status === "Completed" && !row.billPaid && (
                    <Tooltip content="Return order" side="left">
                      <Link
                        href={`/admin/orders/${row._id}?openReturn=1`}
                        aria-label="Return order"
                        className={buttonVariants({ variant: "ghost", size: "icon" }) + " rounded-lg text-blue-600 transition-colors hover:bg-blue-500/15 hover:text-blue-600"}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Link>
                    </Tooltip>
                  )}
                  {row.status === "Dispatch Stage" && (
                    <Tooltip content="Cancel order" side="left">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelOrder(row._id)}
                        aria-label="Cancel order"
                        className="rounded-lg text-destructive transition-colors hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  )}
                </div>
              )}
            />
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalRecords={totalRecords}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            className="shrink-0 rounded-b-lg border-t border-gray-200"
          />
        </div>
      )}
    </div>
  );
}
