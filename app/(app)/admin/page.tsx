import AdminUserList from "@/components/AdminUserList";
import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/queries/admin";

/** docs/specs/admin.md — admins only; everyone else gets a 404 (ADM-02). */
export default async function AdminPage() {
  await requireAdmin();
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Admin</h1>
      <AdminUserList users={await listUsers()} />
    </>
  );
}
