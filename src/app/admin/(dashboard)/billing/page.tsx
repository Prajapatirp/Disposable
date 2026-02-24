"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DataTable,
  Column,
  Filters,
  Pagination,
  PrimaryButton,
  StatusBadge,
  Modal,
  PageLoading,
} from "@/components/ui";
import { BillForm } from "@/components/forms/BillForm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface Bill {
  _id: string;
  billNumber: string;
  clientId: { _id: string; firstName: string; lastName: string } | string;
  totalAmount: number;
  status: string;
  billDate: string;
  paidDate?: string;
}

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Paid", label: "Paid" },
];

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [clients, setClients] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const url = clientFilter
        ? `/api/bills?clientId=${encodeURIComponent(clientFilter)}`
        : "/api/bills";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBills(data);
    } catch {
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [clientFilter]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(() => {});
  }, []);

  const clientName = (b: Bill) => {
    const c = b.clientId;
    if (typeof c === "object" && c) return `${c.firstName} ${c.lastName}`;
    return "—";
  };

  const filtered = bills
    .filter((b) => {
      const matchClient = !search || clientName(b).toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || b.status === statusFilter;
      return matchClient && matchStatus;
    })
    .sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const clientOptions = [
    { value: "", label: "All clients" },
    ...clients.map((c) => ({ value: c._id, label: `${c.firstName} ${c.lastName}` })),
  ];

  const columns: Column<Bill>[] = [
    { id: "billNumber", header: "Bill #", accessor: "billNumber" },
    {
      id: "client",
      header: "Client",
      accessor: (row) => clientName(row),
    },
    {
      id: "totalAmount",
      header: "Amount",
      accessor: (row) => `₹${row.totalAmount.toLocaleString()}`,
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} type="bill" />,
    },
    {
      id: "billDate",
      header: "Date",
      accessor: (row) => new Date(row.billDate).toLocaleDateString(),
    },
    {
      id: "paidDate",
      header: "Paid on",
      accessor: (row) =>
        row.paidDate ? new Date(row.paidDate).toLocaleDateString() : "—",
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Generate and manage bills</p>
        </div>
        <PrimaryButton onClick={() => setModalOpen(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Generate Bill
        </PrimaryButton>
      </div>

      <div className="mb-4">
        <Filters
          searchPlaceholder="Search by client..."
          searchValue={search}
          onSearchChange={setSearch}
          dropdownLabel="Client"
          dropdownOptions={clientOptions}
          dropdownValue={clientFilter}
          onDropdownChange={(v) => {
            setClientFilter(v);
            setPage(1);
          }}
        />
        <div className="mt-2 flex gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginated}
            actions={(row) => (
              <div className="flex justify-end">
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
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
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
