"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderForm } from "@/components/forms/OrderForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewOrderPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Order</h1>
          <p className="text-muted-foreground">
            Select a client and add order items
          </p>
        </div>
      </div>
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderForm
            onSuccess={() => router.push("/admin/orders")}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
