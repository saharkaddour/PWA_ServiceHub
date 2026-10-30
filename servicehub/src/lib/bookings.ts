import { randomUUID } from "node:crypto";
import type { Collection, Filter } from "mongodb";
import clientPromise from "@/lib/db/mongodb";

export const bookingStatuses = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export type Booking = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  customerId: string;
  providerId: string;
  preferredDate: string;
  note: string;
  status: BookingStatus;
  clientRequestId: string;
  createdAt: string;
};

type BookingDocument = Omit<Booking, "id" | "createdAt"> & {
  _id: string;
  createdAt: Date;
};

async function getBookingsCollection(): Promise<Collection<BookingDocument>> {
  const client = await clientPromise;
  return client
    .db(process.env.MONGODB_DB ?? "servicehub")
    .collection<BookingDocument>("bookings");
}

function toBooking(document: BookingDocument): Booking {
  return {
    ...document,
    id: document._id,
    createdAt: document.createdAt.toISOString(),
  };
}

export async function listBookings(userId: string, role: "CUSTOMER" | "PROVIDER") {
  const collection = await getBookingsCollection();
  const filter: Filter<BookingDocument> =
    role === "CUSTOMER" ? { customerId: userId } : { providerId: userId };
  const documents = await collection.find(filter).sort({ createdAt: -1 }).toArray();
  return documents.map(toBooking);
}

export async function createBooking(input: {
  serviceId: string;
  serviceTitle: string;
  customerId: string;
  providerId: string;
  preferredDate: string;
  note: string;
  clientRequestId: string;
}) {
  const collection = await getBookingsCollection();
  await collection.createIndex(
    { customerId: 1, clientRequestId: 1 },
    { unique: true },
  );
  const existing = await collection.findOne({
    clientRequestId: input.clientRequestId,
    customerId: input.customerId,
  });
  if (existing) {
    return toBooking(existing);
  }

  const document: BookingDocument = {
    _id: randomUUID(),
    ...input,
    status: "PENDING",
    createdAt: new Date(),
  };
  try {
    await collection.insertOne(document);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) {
      throw error;
    }
    const duplicate = await collection.findOne({
      clientRequestId: input.clientRequestId,
      customerId: input.customerId,
    });
    if (!duplicate) throw error;
    return toBooking(duplicate);
  }
  return toBooking(document);
}

export async function updateBookingStatus(
  id: string,
  userId: string,
  role: "CUSTOMER" | "PROVIDER",
  status: BookingStatus,
) {
  const collection = await getBookingsCollection();
  const booking = await collection.findOne({ _id: id });
  if (!booking) return null;

  const permitted =
    role === "PROVIDER"
      ? booking.providerId === userId
      : booking.customerId === userId;
  if (!permitted || !isValidTransition(booking.status, status, role)) {
    return undefined;
  }

  const result = await collection.findOneAndUpdate(
    { _id: id, status: booking.status },
    { $set: { status } },
    { returnDocument: "after" },
  );
  return result ? toBooking(result) : null;
}

function isValidTransition(
  current: BookingStatus,
  next: BookingStatus,
  role: "CUSTOMER" | "PROVIDER",
) {
  if (current === next) return false;
  if (role === "PROVIDER") {
    return current === "PENDING" && (next === "ACCEPTED" || next === "REJECTED") ||
      current === "ACCEPTED" && next === "COMPLETED";
  }
  return current === "PENDING" && next === "CANCELLED";
}
