const CACHE = "servicehub-v11";
const APP_SHELL = ["/offline"];

function isServiceDetailNavigation(request, url) {
  return request.mode === "navigate" && /^\/services\/[^/]+$/.test(url.pathname);
}

function offlineServiceResponse(id) {
  const escapedId = JSON.stringify(id);
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ServiceHub</title>
    <style>
      body { margin: 0; background: #f5f8fb; color: #12263a; font: 16px system-ui, sans-serif; }
      main { width: min(100% - 2.5rem, 42rem); margin: 0 auto; padding: 2rem 0 4rem; }
      a { color: #1f4e79; font-weight: 700; }
      .header { display: grid; gap: .75rem; margin: 2rem 0 1.25rem; }
      .category { color: #1f4e79; font-size: .8rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      h1 { font-size: clamp(2.2rem, 8vw, 4rem); letter-spacing: -.05em; margin: 0; }
      .price { font-size: 1.25rem; font-weight: 700; }
      .offline { border-radius: .5rem; background: #fff5d6; color: #785b00; padding: .75rem; }
      .card { border: 1px solid #dfe7ee; border-radius: 1rem; background: #fff; padding: 1.5rem; }
      .description { color: #536273; line-height: 1.7; }
      form { display: grid; gap: .75rem; border-top: 1px solid #dfe7ee; margin-top: 1.25rem; padding-top: 1.25rem; }
      label { display: grid; gap: .35rem; font-weight: 700; }
      input, textarea, button { font: inherit; padding: .65rem; }
      input, textarea { border: 1px solid #b9c9d6; border-radius: .4rem; }
      button { border: 0; border-radius: .5rem; background: #1f4e79; color: #fff; cursor: pointer; font-weight: 700; }
      .error { color: #a52c22; }
    </style>
  </head>
  <body>
    <main>
      <a href="/services">← Services</a>
      <div id="content">
        <p>Loading cached content…</p>
        <p>Checking for a previously viewed service…</p>
      </div>
    </main>
    <script>
      (() => {
        const id = ${escapedId};
        const content = document.getElementById("content");
        try {
          const service = JSON.parse(localStorage.getItem("servicehub-service-" + id) || "null");
          if (!service) throw new Error("No saved service was found.");
          content.innerHTML = "";
          const header = document.createElement("div");
          header.className = "header";
          header.innerHTML = '<span class="category"></span><h1></h1><strong class="price"></strong>';
          header.querySelector(".category").textContent = service.category;
          header.querySelector("h1").textContent = service.title;
          header.querySelector(".price").textContent = "€" + Number(service.price).toFixed(2);
          const notice = document.createElement("p");
          notice.className = "offline";
          notice.textContent = "Offline copy — may be outdated";
          const card = document.createElement("div");
          card.className = "card";
          const description = document.createElement("p");
          description.className = "description";
          description.textContent = service.description;
          card.append(description);
          const form = document.createElement("form");
          form.innerHTML = '<strong>Request this service</strong><label>Preferred date<input type="date" required></label><label>Note (optional)<textarea maxlength="500"></textarea></label><button type="submit">Save request for sync</button><p class="form-message"></p>';
          const date = form.querySelector("input");
          date.min = new Date().toISOString().slice(0, 10);
          form.addEventListener("submit", (event) => {
            event.preventDefault();
            const request = {
              clientRequestId: crypto.randomUUID(),
              serviceId: id,
              preferredDate: date.value,
              note: form.querySelector("textarea").value,
              serviceTitle: service.title,
              state: "PENDING_SYNC"
            };
            const databaseRequest = indexedDB.open("servicehub-offline", 1);
            databaseRequest.onupgradeneeded = () => databaseRequest.result.createObjectStore("bookings", { keyPath: "clientRequestId" });
            databaseRequest.onsuccess = () => {
              const database = databaseRequest.result;
              const transaction = database.transaction("bookings", "readwrite");
              transaction.objectStore("bookings").put(request);
              transaction.oncomplete = () => {
                form.querySelector(".form-message").textContent = "Pending sync — reconnect to send your request.";
                form.querySelector("button").disabled = true;
                database.close();
              };
            };
          });
          content.append(header, notice, card, form);
        } catch (error) {
          content.innerHTML = '<h1>You are offline</h1><p class="error"></p><a href="/">Return home</a>';
          content.querySelector(".error").textContent = error.message;
        }
      })();
    </script>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Private API responses and conversations must never be cached.
  if (url.pathname.startsWith("/api/") || url.pathname === "/messages" || url.pathname.startsWith("/messages/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response.ok &&
          response.type !== "opaque" &&
          !isServiceDetailNavigation(request, url)
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        if (isServiceDetailNavigation(request, url)) {
          return offlineServiceResponse(url.pathname.split("/")[2]);
        }
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        if (request.mode === "navigate") {
          return (await caches.match("/offline")) || Response.error();
        }
        return Response.error();
      }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    // A push must still show a notification if the payload is malformed.
  }
  event.waitUntil(self.registration.showNotification(payload.title || "New booking request", {
    body: payload.body || "Open ServiceHub to view your bookings.",
    icon: "/icons/icon-192.png",
    tag: payload.tag || "servicehub-booking",
    data: { url: "/bookings" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let targetUrl = new URL("/bookings", self.location.origin).href;
  try {
    const requested = new URL(event.notification.data?.url || "/bookings", self.location.origin);
    if (requested.origin === self.location.origin) targetUrl = requested.href;
  } catch {
    // Use bookings for invalid links.
  }
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((client) => "focus" in client);
      if (existing) {
        try {
          const navigated = await existing.navigate(targetUrl);
          if (navigated) return await navigated.focus();
        } catch {
          // A window may have closed between lookup and navigation.
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
