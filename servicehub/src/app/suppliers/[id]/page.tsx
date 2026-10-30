import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { getSupplierListing } from "@/lib/suppliers";

export const dynamic = "force-dynamic";
export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getSupplierListing(id);
  if (!listing) notFound();
  const user = await getUserFromSession((await cookies()).get(SESSION_COOKIE)?.value);
  return <main style={{ width: "min(100% - 2.5rem, 42rem)", margin: "0 auto", padding: "2rem 0 4rem" }}><Link href="/suppliers">← Supplier listings</Link><p>{listing.category}</p><h1>{listing.name}</h1><p>{listing.description}</p><strong>€{listing.price.toFixed(2)}</strong>{user?.id === listing.supplierId && <p><Link href={`/suppliers/${id}/edit`}>Edit listing</Link></p>}</main>;
}
