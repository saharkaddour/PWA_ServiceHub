import ServiceCatalog from "@/components/ServiceCatalog";
import { listPublishedServices } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  return <ServiceCatalog services={await listPublishedServices()} />;
}
