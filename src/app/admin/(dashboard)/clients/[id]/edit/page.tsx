"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/components/forms/ClientForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { toast } from "sonner";

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  businessName?: string;
  gstNumber?: string;
  companyAddress?: string;
}

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setClient(data);
      })
      .catch(() => toast.error("Failed to load client"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !client) return <PageLoading />;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/clients/${id}`}>
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
          <p className="text-muted-foreground">
            Update {client.firstName} {client.lastName}
          </p>
        </div>
      </div>
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            initial={{
              _id: client._id,
              firstName: client.firstName,
              lastName: client.lastName,
              phoneNumber: client.phoneNumber,
              address: client.address,
              addressLine1: client.addressLine1,
              addressLine2: client.addressLine2,
              pincode: client.pincode,
              city: client.city,
              state: client.state,
              country: client.country,
              businessName: client.businessName,
              gstNumber: client.gstNumber,
              companyAddress: client.companyAddress,
            }}
            onSuccess={() => router.push("/admin/clients")}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
