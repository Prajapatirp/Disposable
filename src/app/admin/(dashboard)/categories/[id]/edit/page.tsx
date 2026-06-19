"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { toast } from "sonner";

interface Category {
  _id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/categories/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCategory(data);
      })
      .catch(() => toast.error("Failed to load category"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !category) return <PageLoading />;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/categories">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Category</h1>
          <p className="text-muted-foreground">Update {category.name}</p>
        </div>
      </div>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Category details</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            initial={category}
            onSuccess={() => router.push("/admin/categories")}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
