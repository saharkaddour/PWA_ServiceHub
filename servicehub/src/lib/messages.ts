import { randomUUID } from "node:crypto";
import type { Booking } from "@/lib/bookings";
import clientPromise from "@/lib/db/mongodb";

export type Message = {
  id: string;
  bookingId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

type MessageDocument = Omit<Message, "id" | "createdAt"> & {
  _id: string;
  createdAt: Date;
};

export type MessageConversation = {
  bookingId: string;
  serviceTitle: string;
  messages: Message[];
};

async function getCollections() {
  const client = await clientPromise;
  const database = client.db(process.env.MONGODB_DB ?? "servicehub");
  return {
    messages: database.collection<MessageDocument>("messages"),
    bookings: database.collection<Omit<Booking, "id" | "createdAt"> & { _id: string; createdAt: Date }>("bookings"),
  };
}

function toMessage(document: MessageDocument): Message {
  return {
    id: document._id,
    bookingId: document.bookingId,
    senderId: document.senderId,
    text: document.text,
    createdAt: document.createdAt.toISOString(),
  };
}

export async function listMessageConversations(userId: string): Promise<MessageConversation[]> {
  const { messages, bookings } = await getCollections();
  const userBookings = await bookings.find({
    $or: [{ customerId: userId }, { providerId: userId }],
  }).sort({ createdAt: -1 }).toArray();
  const bookingIds = userBookings.map((booking) => booking._id);
  const documents = await messages.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: 1 }).toArray();
  return userBookings
    .map((booking) => ({
      bookingId: booking._id,
      serviceTitle: booking.serviceTitle,
      messages: documents.filter((message) => message.bookingId === booking._id).map(toMessage),
    }))
    .filter((conversation) => conversation.messages.length > 0);
}

export async function createMessage(input: {
  bookingId: string;
  senderId: string;
  text: string;
}): Promise<Message | null | undefined> {
  const { messages, bookings } = await getCollections();
  const booking = await bookings.findOne({
    _id: input.bookingId,
    $or: [{ customerId: input.senderId }, { providerId: input.senderId }],
  });
  if (!booking) return undefined;

  const document: MessageDocument = {
    _id: randomUUID(),
    ...input,
    createdAt: new Date(),
  };
  await messages.insertOne(document);
  return toMessage(document);
}
