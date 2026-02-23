import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminDashboardShell email={session.email}>
      {children}
    </AdminDashboardShell>
  );
}
