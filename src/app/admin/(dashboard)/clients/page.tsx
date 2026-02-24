"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DataTable,
  Column,
  Filters,
  Pagination,
  PageLoading,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  businessName?: string;
}

function formatAddress(c: Client): string {
  if (c.addressLine1 || c.city || c.state) {
    const parts = [c.addressLine1, c.city, c.state, c.pincode].filter(Boolean);
    return parts.join(", ") || "—";
  }
  return c.address ?? "—";
}

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setClients(data);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filtered = clients
    .filter((p) => {
      const full = `${p.firstName} ${p.lastName} ${p.phoneNumber} ${formatAddress(p)}`.toLowerCase();
      return !search || full.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      if (aVal === bVal) return 0;
      const dir = sortDir === "asc" ? 1 : -1;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  async function handleDelete(id: string) {
    if (!confirm("Delete this client?")) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Client deleted");
      fetchClients();
    } catch {
      toast.error("Failed to delete client");
    }
  }

  const columns: Column<Client>[] = [
    {
      id: "firstName",
      header: "Name",
      accessor: (row) => (
        <Link
          href={`/admin/clients/${row._id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.firstName} {row.lastName}
        </Link>
      ),
      sortable: true,
    },
    { id: "phoneNumber", header: "Phone", accessor: "phoneNumber", sortable: true },
    { id: "address", header: "Address", accessor: (row) => formatAddress(row) },
    { id: "businessName", header: "Business", accessor: (row) => row.businessName ?? "—" },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage clients and their details</p>
        </div>
        <Link
          href="/admin/clients/new"
          className={cn(buttonVariants({ variant: "primary" }))}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Link>
      </div>

      <div className="mb-4">
        <Filters
          searchPlaceholder="Search clients..."
          searchValue={search}
          onSearchChange={setSearch}
          onClear={() => setSearch("")}
        />
      </div>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={paginated}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            actions={(row) => (
              <div className="flex justify-end gap-2">
                <Link
                  href={`/admin/clients/${row._id}`}
                  aria-label="View client details"
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                >
                  <Eye className="h-4 w-4" />
                </Link>
                <Link
                  href={`/admin/clients/${row._id}/edit`}
                  aria-label="Edit"
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(row._id)}
                  aria-label="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
