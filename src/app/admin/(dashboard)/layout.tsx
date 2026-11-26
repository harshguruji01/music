import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    const reason =
      auth.status === 503
        ? "unconfigured"
        : auth.status === 403
          ? "forbidden"
          : "expired";
    redirect(`/admin/login?reason=${reason}`);
  }

  return <AdminShell adminEmail={auth.admin.email}>{children}</AdminShell>;
}
