"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/components/forms/ClientForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewClientPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/clients">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Client</h1>
          <p className="text-muted-foreground">Add a new client and their details</p>
        </div>
      </div>
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            onSuccess={() => router.push("/admin/clients")}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
