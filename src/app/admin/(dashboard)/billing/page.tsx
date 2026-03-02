"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DataTable,
  Column,
  Pagination,
  PrimaryButton,
  StatusBadge,
  Modal,
  PageLoading,
  FilterDrawer,
  Input,
  Select,
} from "@/components/ui";
import { BillForm } from "@/components/forms/BillForm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileText, Filter, Printer, Download } from "lucide-react";

interface Bill {
  _id: string;
  billNumber: string;
  clientId: { _id: string; firstName: string; lastName: string } | string;
  totalAmount: number;
  status: string;
  billDate: string;
  paidDate?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Paid", label: "Paid" },
];

export default function BillingPage() {
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

  const columns: Column<Bill>[] = [
    { id: "billNumber", header: "BILL #", accessor: "billNumber" },
    {
      id: "client",
      header: "CLIENT",
      accessor: (row) => clientName(row),
    },
    {
      id: "totalAmount",
      header: "AMOUNT",
      accessor: (row) => `₹${row.totalAmount.toLocaleString()}`,
    },
    {
      id: "status",
      header: "STATUS",
      accessor: (row) => <StatusBadge status={row.status} type="bill" />,
    },
    {
      id: "billDate",
      header: "DATE",
      accessor: (row) => new Date(row.billDate).toLocaleDateString(),
    },
    {
      id: "paidDate",
      header: "PAID ON",
      accessor: (row) =>
        row.paidDate ? new Date(row.paidDate).toLocaleDateString() : "—",
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="relative min-h-0 flex-1 overflow-hidden" style={{ minHeight: 200 }}>
            <DataTable
              columns={columns}
              data={paginated}
              className="h-full min-h-0 w-full flex-1 rounded-none border-0 shadow-none"
              maxHeight="100%"
              actions={(row) => (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/admin/billing/bill/${row._id}`, "_blank")}
                    className="gap-1"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/admin/billing/bill/${row._id}`, "_blank")}
                    className="gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  {row.status === "Pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markPaid(row._id)}
                    >
                      Mark paid
                    </Button>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Bill"
        size="lg"
      >
        <BillForm
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
