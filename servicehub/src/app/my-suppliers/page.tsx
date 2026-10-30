import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SupplierListings from "@/components/SupplierListings";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { listSupplierListings } from "@/lib/suppliers";

export const dynamic = "force-dynamic";
export default async function MySuppliersPage() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user || user.role !== "SUPPLIER") redirect("/suppliers");
  return <SupplierListings listings={await listSupplierListings(user.id)} own />;
}
