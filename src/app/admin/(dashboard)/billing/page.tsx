"use client";

import { useEffect, useState, useCallback } from "react";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Pagination,
  PrimaryButton,
  StatusBadge,
  Modal,
  PageLoading,
  FilterDrawer,
  Input,
  Select,
  Tooltip,
} from "@/components/ui";
import { BillForm } from "@/components/forms/BillForm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileText, Filter, Download, ChevronDown, ChevronRight, History, Package } from "lucide-react";
import Link from "next/link";

interface Bill {
  _id: string;
  billNumber: string;
  clientId: { _id: string; firstName: string; lastName: string } | string;
  totalAmount: number;
  status: string;
  billDate: string;
  paidDate?: string;
  replacedByBillId?: { _id: string; billNumber: string } | null;
}

interface BillHistoryEntry {
  _id: string;
  action: string;
  details?: string;
  performedBy: string;
  performedAt: string;
}

interface OrderActivityEntry {
  _id: string;
  orderId: { _id: string; orderNumber?: string } | null;
  statusName: string;
  action: string;
  performedBy: string;
  performedAt: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Paid", label: "Paid" },
  { value: "Superseded", label: "Superseded" },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [clients, setClients] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [billNumberFilter, setBillNumberFilter] = useState("");
  const [clientIdFilter, setClientIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [billHistoryCache, setBillHistoryCache] = useState<Record<string, BillHistoryEntry[]>>({});
  const [orderActivityCache, setOrderActivityCache] = useState<Record<string, OrderActivityEntry[]>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clientIdFilter) params.set("clientId", clientIdFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (billNumberFilter.trim()) params.set("billNumber", billNumberFilter.trim());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const url = `/api/bills${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBills(data);
    } catch {
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [clientIdFilter, statusFilter, billNumberFilter, startDate, endDate]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const createForClient = searchParams.get("createForClient") ?? "";
  const openCreate = searchParams.get("openCreate") === "1";
  const previousBillId = searchParams.get("previousBillId") ?? "";
  useEffect(() => {
    if (openCreate && createForClient) {
      setModalOpen(true);
    }
  }, [openCreate, createForClient]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setClients(data) : setClients([])))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (filterOpen && clients.length === 0) {
      fetch("/api/clients")
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? setClients(data) : setClients([])))
        .catch(() => setClients([]));
    }
  }, [filterOpen, clients.length]);

  const clientName = (b: Bill) => {
    const c = b.clientId;
    if (typeof c === "object" && c) return `${c.firstName} ${c.lastName}`;
    return "—";
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setBillNumberFilter("");
    setClientIdFilter("");
    setStatusFilter("");
    setFilterOpen(false);
  };

  const applyFilters = () => {
    setFilterOpen(false);
  };

  const filtered = bills;
  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  async function markPaid(id: string) {
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Paid" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Bill marked as paid");
      fetchBills();
    } catch {
      toast.error("Failed to update bill");
    }
  }

  function toggleHistory(billId: string) {
    if (expandedBillId === billId) {
      setExpandedBillId(null);
      return;
    }
    setExpandedBillId(billId);
    const needHistory = !billHistoryCache[billId];
    const needActivity = !orderActivityCache[billId];
    if (!needHistory && !needActivity) return;
    if (needHistory || needActivity) setLoadingHistoryId(billId);
    const promises: Promise<void>[] = [];
    if (needHistory) {
      promises.push(
        fetch(`/api/bills/${billId}/history`)
          .then((r) => r.json())
          .then((data) => {
            setBillHistoryCache((prev) => ({ ...prev, [billId]: Array.isArray(data) ? data : [] }));
          })
      );
    }
    if (needActivity) {
      promises.push(
        fetch(`/api/bills/${billId}/order-activity`)
          .then((r) => r.json())
          .then((data) => {
            setOrderActivityCache((prev) => ({ ...prev, [billId]: Array.isArray(data) ? data : [] }));
          })
      );
    }
    Promise.all(promises)
      .catch(() => toast.error("Failed to load details"))
      .finally(() => setLoadingHistoryId(null));
  }

  function formatHistoryDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  const columns = [
    { id: "billNumber", header: "BILL #" },
    { id: "client", header: "CLIENT" },
    { id: "totalAmount", header: "AMOUNT" },
    { id: "status", header: "STATUS" },
    { id: "billDate", header: "DATE" },
    { id: "paidDate", header: "PAID ON" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
      <div className="mb-4 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Billing</h1>
          <p className="text-muted-foreground">Generate and manage bills</p>
        </div>
        <PrimaryButton onClick={() => setModalOpen(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Generate Bill
        </PrimaryButton>
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
        title="Filter bills"
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
            label="Bill number"
            placeholder="e.g. BILL-2025-0001"
            value={billNumberFilter}
            onChange={(e) => setBillNumberFilter(e.target.value)}
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
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="relative min-h-0 flex-1 overflow-auto" style={{ minHeight: 200 }}>
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 border-b-2 border-gray-200 bg-gray-100 [&>tr]:bg-gray-100">
                <tr>
                  <th className="w-9 bg-gray-100 px-2 py-3.5" aria-label="Expand" />
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className="bg-gray-100 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700"
                    >
                      {col.header}
                    </th>
                  ))}
                  <th className="min-w-[120px] bg-gray-100 pl-4 pr-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No data found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <React.Fragment key={row._id}>
                      <tr
                        className="border-b border-gray-100 transition-colors hover:bg-gray-100"
                      >
                        <td className="w-9 px-2 py-3">
                          <Tooltip
                            content={expandedBillId === row._id ? "Collapse history" : "Expand history"}
                            side="left"
                          >
                            <button
                              type="button"
                              onClick={() => toggleHistory(row._id)}
                              className="flex items-center justify-center rounded p-1 hover:bg-gray-200"
                              aria-label={expandedBillId === row._id ? "Collapse history" : "Expand history"}
                            >
                              {loadingHistoryId === row._id ? (
                                <span className="text-muted-foreground">...</span>
                              ) : expandedBillId === row._id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </Tooltip>
                        </td>
                        <td className="px-4 py-3">{row.billNumber}</td>
                        <td className="px-4 py-3">{clientName(row)}</td>
                        <td className="px-4 py-3">₹{row.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <StatusBadge status={row.status} type="bill" />
                            {row.status === "Superseded" &&
                              row.replacedByBillId &&
                              typeof row.replacedByBillId === "object" && (
                                <Link
                                  href={`/admin/billing/bill/${row.replacedByBillId._id}`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Replaced by {row.replacedByBillId.billNumber}
                                </Link>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{new Date(row.billDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {row.paidDate ? new Date(row.paidDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="pl-4 pr-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip content="Download bill" side="left">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/admin/billing/bill/${row._id}`, "_blank")}
                                className="gap-1"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </Tooltip>
                            {row.status === "Pending" && (
                              <Tooltip content="Mark as paid" side="left">
                                <Button variant="outline" size="sm" onClick={() => markPaid(row._id)}>
                                  Mark paid
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedBillId === row._id && (
                        <tr key={`${row._id}-history`} className="border-b border-gray-100 bg-gray-50/80">
                          <td colSpan={columns.length + 2} className="px-4 py-3">
                            <div className="space-y-6">
                              {/* Orders for this bill — same timeline as order detail "Bills for this order" */}
                              {loadingHistoryId === row._id ? null : (
                                <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Package className="h-4 w-4" />
                                    Orders for this bill
                                  </div>
                                  <p className="mb-3 text-sm text-muted-foreground">
                                    All orders added to or removed from this bill (from order history):
                                  </p>
                                  {(orderActivityCache[row._id]?.length ?? 0) === 0 ? (
                                    <p className="text-sm text-muted-foreground">No orders added or removed from this bill yet.</p>
                                  ) : (
                                    <div className="relative flex flex-col gap-0">
                                    {(orderActivityCache[row._id] ?? []).map((entry, index, arr) => {
                                      const isAdded = entry.statusName === "Added to bill";
                                      const orderLabel = entry.orderId?.orderNumber ?? (entry.orderId ? `#${String(entry.orderId._id).slice(-6)}` : "—");
                                      return (
                                        <div key={entry._id} className="flex gap-4 pb-4 last:pb-0">
                                          <div className="flex flex-col items-center">
                                            <div className="h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                                            {index < arr.length - 1 && (
                                              <div className="mt-0.5 h-full w-px shrink-0 bg-border" style={{ minHeight: 24 }} />
                                            )}
                                          </div>
                                          <div className="min-w-0 flex-1 pt-0.5">
                                            <p className="font-medium">
                                              {isAdded ? "Added to bill" : "Removed from bill"}
                                              {orderLabel && entry.orderId ? (
                                                <> — Order{" "}
                                                  <Link href={`/admin/orders/${entry.orderId._id}`} className="text-primary hover:underline">
                                                    {orderLabel}
                                                  </Link>
                                                </>
                                              ) : orderLabel ? ` — Order ${orderLabel}` : ""}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {entry.performedBy ? `by ${entry.performedBy}` : ""}
                                              {" — "}
                                              {formatHistoryDate(entry.performedAt)}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  )}
                                </div>
                              )}

                              {/* Bill history */}
                              <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <History className="h-4 w-4" />
                                Bill history
                              </div>
                              {loadingHistoryId === row._id ? (
                                <p className="text-sm text-muted-foreground">Loading...</p>
                              ) : !billHistoryCache[row._id]?.length ? (
                                <p className="text-sm text-muted-foreground">No history recorded yet.</p>
                              ) : (
                                <>
                                  <p className="mb-1 text-xs text-muted-foreground">
                                    All previous billing records are kept. No entries are removed.
                                  </p>
                                  <p className="mb-3 text-sm font-medium text-foreground">
                                    {billHistoryCache[row._id]!.length} update(s) recorded — who made the update and when is listed below (latest at top).
                                  </p>
                                  <div className="relative flex flex-col gap-0">
                                    {(billHistoryCache[row._id] ?? []).map((entry, index) => (
                                      <div key={entry._id} className="flex gap-4 pb-4 last:pb-0">
                                        <div className="flex flex-col items-center">
                                          <div className="h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                                          {index < (billHistoryCache[row._id]?.length ?? 0) - 1 && (
                                            <div className="mt-0.5 h-full w-px shrink-0 bg-border" style={{ minHeight: 24 }} />
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                          <p className="font-medium">{entry.action}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {entry.details ? `${entry.details}. ` : ""}
                                            {entry.performedBy ? `by ${entry.performedBy}` : ""}
                                            {" — "}
                                            {formatHistoryDate(entry.performedAt)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Bill"
        size="lg"
      >
        <BillForm
          initialClientId={createForClient || undefined}
          previousBillId={previousBillId || undefined}
          onSuccess={() => {
            setModalOpen(false);
            fetchBills();
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
