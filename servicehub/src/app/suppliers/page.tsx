import SupplierListings from "@/components/SupplierListings";
import { listSupplierListings } from "@/lib/suppliers";

export const dynamic = "force-dynamic";
export default async function SuppliersPage() {
  return <SupplierListings listings={await listSupplierListings()} />;
}
