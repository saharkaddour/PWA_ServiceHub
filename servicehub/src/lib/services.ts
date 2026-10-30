import { randomUUID } from "node:crypto";
import type { Collection, Filter } from "mongodb";
import clientPromise from "@/lib/db/mongodb";

export const serviceStatuses = ["PUBLISHED", "ARCHIVED"] as const;
export type ServiceStatus = (typeof serviceStatuses)[number];

export type Service = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  providerId: string;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
};

type ServiceDocument = Omit<Service, "id" | "createdAt" | "updatedAt"> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

async function getServicesCollection(): Promise<Collection<ServiceDocument>> {
  const client = await clientPromise;
  return client
    .db(process.env.MONGODB_DB ?? "servicehub")
    .collection<ServiceDocument>("services");
}

function toService(document: ServiceDocument): Service {
  return {
    id: document._id,
    title: document.title,
    description: document.description,
    category: document.category,
    price: document.price,
    providerId: document.providerId,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function listPublishedServices(): Promise<Service[]> {
  const collection = await getServicesCollection();
  const documents = await collection
    .find({ status: "PUBLISHED" })
    .sort({ createdAt: -1 })
    .toArray();
  return documents.map(toService);
}

export async function listProviderServices(providerId: string): Promise<Service[]> {
  const collection = await getServicesCollection();
  const documents = await collection
    .find({ providerId })
    .sort({ createdAt: -1 })
    .toArray();
  return documents.map(toService);
}

export async function getService(
  id: string,
  providerId?: string,
): Promise<Service | null> {
  const collection = await getServicesCollection();
  const filter: Filter<ServiceDocument> = providerId
    ? { _id: id, providerId }
    : { _id: id, status: "PUBLISHED" };
  const document = await collection.findOne(filter);
  return document ? toService(document) : null;
}

export async function createService(input: {
  title: string;
  description: string;
  category: string;
  price: number;
  providerId: string;
}): Promise<Service> {
  const collection = await getServicesCollection();
  const now = new Date();
  const document: ServiceDocument = {
    _id: randomUUID(),
    title: input.title,
    description: input.description,
    category: input.category,
    price: input.price,
    providerId: input.providerId,
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(document);
  return toService(document);
}

export async function updateService(
  id: string,
  providerId: string,
  input: Partial<Pick<Service, "title" | "description" | "category" | "price" | "status">>,
): Promise<Service | null> {
  const collection = await getServicesCollection();
  const result = await collection.findOneAndUpdate(
    { _id: id, providerId },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? toService(result) : null;
}

export async function deleteService(id: string, providerId: string): Promise<boolean> {
  const collection = await getServicesCollection();
  const result = await collection.deleteOne({ _id: id, providerId });
  return result.deletedCount === 1;
}
