"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewCategoryPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/categories">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Category</h1>
          <p className="text-muted-foreground">Add a category for products</p>
        </div>
      </div>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Category details</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            onSuccess={() => router.push("/admin/categories")}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
