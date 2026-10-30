import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ServiceForm from "@/components/ServiceForm";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { getService } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user || user.role !== "PROVIDER") redirect("/login");
  const service = await getService(id, user.id);
  if (!service) notFound();
  return (
    <main style={{ width: "min(100% - 2.5rem, 42rem)", margin: "0 auto", padding: "2rem 0 4rem" }}>
      <h1>Edit service</h1>
      <ServiceForm service={service} />
    </main>
  );
}
