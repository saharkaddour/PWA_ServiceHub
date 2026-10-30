import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ServiceDetail from "@/components/ServiceDetail";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { getService } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  return (
    <ServiceDetail
      initialService={service}
      canEdit={user?.role === "PROVIDER" && user.id === service.providerId}
      canRequest={user?.role === "CUSTOMER"}
    />
  );
}
