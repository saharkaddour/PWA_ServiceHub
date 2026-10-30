import { createHash } from "node:crypto";
import webpush from "web-push";
import clientPromise from "@/lib/db/mongodb";
import type { Booking } from "@/lib/bookings";

type SubscriptionDocument = {
  _id: string;
  userId: string;
  subscription: webpush.PushSubscription;
};

export function getPushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

async function subscriptions() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? "servicehub")
    .collection<SubscriptionDocument>("pushSubscriptions");
}

export function parsePushSubscription(value: unknown): webpush.PushSubscription | null {
  if (!value || typeof value !== "object") return null;
  const { endpoint, keys } = value as Record<string, unknown>;
  if (typeof endpoint !== "string" || endpoint.length > 4096 || !keys || typeof keys !== "object") return null;
  const { p256dh, auth } = keys as Record<string, unknown>;
  if (typeof p256dh !== "string" || typeof auth !== "string" ||
      !/^[A-Za-z0-9_-]{87}=?$/.test(p256dh) || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(auth)) return null;
  try {
    const url = new URL(endpoint);
    // Only browser push services may be called by the server.
    const allowed = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"];
    if (url.protocol !== "https:" || url.port || url.username || url.password ||
        !(allowed.includes(url.hostname) || url.hostname.endsWith(".notify.windows.com"))) return null;
  } catch {
    return null;
  }
  return { endpoint, keys: { p256dh, auth } };
}

export async function savePushSubscription(userId: string, subscription: webpush.PushSubscription) {
  const collection = await subscriptions();
  // One browser subscription belongs to the most recently signed-in provider.
  const id = createHash("sha256").update(subscription.endpoint).digest("hex");
  await collection.updateOne({ _id: id }, { $set: { userId, subscription } }, { upsert: true });
}

export async function notifyProviderOfBooking(booking: Booking) {
  const config = getPushConfig();
  if (!config) return;
  const collection = await subscriptions();
  const devices = await collection.find({ userId: booking.providerId }).toArray();
  const payload = JSON.stringify({
    title: "New booking request",
    body: `${booking.serviceTitle} has a new service request.`,
    tag: `servicehub-booking-${booking.id}`,
    url: "/bookings",
  });
  await Promise.all(devices.map(async (device) => {
    try {
      await webpush.sendNotification(device.subscription, payload, {
        vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
        TTL: 60 * 60,
        timeout: 5000,
      });
    } catch (error) {
      const status = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
      if (status === 404 || status === 410) {
        await collection.deleteOne({ _id: device._id, userId: booking.providerId });
      } else {
        console.error("Booking push delivery failed", { status });
      }
    }
  }));
}
