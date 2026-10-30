import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import SupplierForm from "@/components/SupplierForm";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { getSupplierListing } from "@/lib/suppliers";

export const dynamic = "force-dynamic";
export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserFromSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user || user.role !== "SUPPLIER") redirect("/login");
  const listing = await getSupplierListing(id, user.id);
  if (!listing) notFound();
  return <main style={{ width: "min(100% - 2.5rem, 42rem)", margin: "0 auto", padding: "2rem 0 4rem" }}><h1>Edit supplier listing</h1><SupplierForm listing={listing} /></main>;
}
