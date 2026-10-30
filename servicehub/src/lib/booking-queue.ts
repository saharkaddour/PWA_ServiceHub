export type PendingBooking = {
  clientRequestId: string;
  serviceId: string;
  preferredDate: string;
  note: string;
  serviceTitle: string;
  state: "PENDING_SYNC" | "SYNC_FAILED";
  error?: string;
};

const DB_NAME = "servicehub-offline";
const STORE_NAME = "bookings";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, {
      keyPath: "clientRequestId",
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingBooking(booking: PendingBooking) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME).put(booking);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function getPendingBookings(): Promise<PendingBooking[]> {
  const database = await openDatabase();
  const bookings = await new Promise<PendingBooking[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return bookings;
}

export async function removePendingBooking(clientRequestId: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME).delete(clientRequestId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}
