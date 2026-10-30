let pushActive = false;
let registrationPromise: Promise<ServiceWorkerRegistration> | undefined;

export function hasActivePush() {
  return pushActive;
}

export function registerNotificationsWorker() {
  if (!registrationPromise) {
    registrationPromise = (async () => {
      await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Notifications could not start. Please retry.")), 15000);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    })().catch((error) => {
      registrationPromise = undefined;
      throw error;
    });
  }
  return registrationPromise;
}

export async function connectPush(create: boolean): Promise<boolean> {
  pushActive = false;
  if (!("PushManager" in window)) return false;
  const response = await fetch("/api/notifications", { cache: "no-store" });
  if (!response.ok) throw new Error("Notification settings could not be loaded. Please retry.");
  const { publicKey } = await response.json();
  if (!publicKey) return false;
  const registration = await registerNotificationsWorker();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription && create) {
    const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  }
  if (!subscription) return false;
  const saved = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!saved.ok) throw new Error("Notifications could not be enabled. Please retry.");
  pushActive = true;
  return true;
}
