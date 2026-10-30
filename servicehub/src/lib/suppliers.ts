import { randomUUID } from "node:crypto";
import type { Collection } from "mongodb";
import clientPromise from "@/lib/db/mongodb";

export type SupplierListing = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
};

type SupplierDocument = Omit<SupplierListing, "id" | "createdAt" | "updatedAt"> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

async function getCollection(): Promise<Collection<SupplierDocument>> {
  const client = await clientPromise;
  return client
    .db(process.env.MONGODB_DB ?? "servicehub")
    .collection<SupplierDocument>("supplierListings");
}

function toListing(document: SupplierDocument): SupplierListing {
  return {
    id: document._id,
    name: document.name,
    category: document.category,
    description: document.description,
    price: document.price,
    supplierId: document.supplierId,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function listSupplierListings(
  supplierId?: string,
): Promise<SupplierListing[]> {
  const listings = await getCollection();
  const documents = await listings
    .find(supplierId ? { supplierId } : {})
    .sort({ createdAt: -1 })
    .toArray();
  return documents.map(toListing);
}

export async function getSupplierListing(
  id: string,
  supplierId?: string,
): Promise<SupplierListing | null> {
  const listings = await getCollection();
  const document = await listings.findOne(
    supplierId ? { _id: id, supplierId } : { _id: id },
  );
  return document ? toListing(document) : null;
}

export async function createSupplierListing(input: {
  name: string;
  category: string;
  description: string;
  price: number;
  supplierId: string;
}): Promise<SupplierListing> {
  const listings = await getCollection();
  const now = new Date();
  const document: SupplierDocument = {
    _id: randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await listings.insertOne(document);
  return toListing(document);
}

export async function updateSupplierListing(
  id: string,
  supplierId: string,
  input: Omit<Partial<SupplierListing>, "id" | "supplierId" | "createdAt" | "updatedAt">,
): Promise<SupplierListing | null> {
  const listings = await getCollection();
  const result = await listings.findOneAndUpdate(
    { _id: id, supplierId },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? toListing(result) : null;
}

export async function deleteSupplierListing(
  id: string,
  supplierId: string,
): Promise<boolean> {
  const listings = await getCollection();
  const result = await listings.deleteOne({ _id: id, supplierId });
  return result.deletedCount === 1;
}
