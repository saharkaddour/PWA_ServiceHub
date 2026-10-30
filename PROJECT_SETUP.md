# Project Setup — Next.js + MongoDB PWA

## 1. Create the app

```bash
npx create-next-app@latest servicehub
cd servicehub
npm install mongodb
```

Choose TypeScript and App Router. Tailwind is optional. Keep dependencies minimal.

## 2. Suggested structure

```text
servicehub/
├── public/
│   ├── icons/icon-192.png
│   ├── icons/icon-512.png
│   ├── sw.js
│   └── offline.html
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── manifest.ts
│   │   ├── offline/page.tsx
│   │   ├── services/page.tsx
│   │   ├── services/[id]/page.tsx
│   │   ├── suppliers/page.tsx
│   │   ├── bookings/page.tsx
│   │   ├── messages/page.tsx
│   │   ├── reviews/page.tsx
│   │   └── api/
│   │       ├── services/route.ts
│   │       ├── services/[id]/route.ts
│   │       ├── suppliers/route.ts
│   │       ├── suppliers/[id]/route.ts
│   │       ├── bookings/route.ts
│   │       ├── bookings/[id]/route.ts
│   │       ├── messages/route.ts
│   │       ├── reviews/route.ts
│   │       └── reports/route.ts
│   ├── components/
│   ├── features/
│   │   ├── profiles/
│   │   ├── services/
│   │   ├── suppliers/
│   │   ├── bookings/
│   │   ├── messaging/
│   │   └── reviews-reports/
│   ├── lib/db/mongodb.ts
│   └── types/
├── .env.local
└── .env.example
```

Create files as needed; this is a guide, not a requirement to create empty files.

## 3. MongoDB environment

Create `.env.local` in the root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
MONGODB_DB=servicehub
```

Never commit `.env.local`. Put placeholder names only in `.env.example`.

Create `src/lib/db/mongodb.ts`:

```ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

const options = {};
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
```

Use this only from server code:

```ts
import clientPromise from "@/lib/db/mongodb";

const client = await clientPromise;
const db = client.db(process.env.MONGODB_DB ?? "servicehub");
```

## 4. Manifest

Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ServiceHub",
    short_name: "ServiceHub",
    description: "Find local services and manage service requests.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1f4e79",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
```

Add real PNG icons at those paths. Next.js exposes the manifest route automatically from `app/manifest.ts`.

In `src/app/layout.tsx`, merge in:

```ts
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ServiceHub",
  description: "Local services marketplace"
};

export const viewport: Viewport = { themeColor: "#1f4e79" };
```

## 5. Offline fallback and shared service worker

Create `src/app/offline/page.tsx` with a simple “You are offline” message and a link to `/`.

Create `public/sw.js`:

```js
const CACHE = "servicehub-v1";
const APP_SHELL = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match("/offline")) ||
          Response.error()
        )
    );
  }
});
```

This is a starting point. Do not assume caching a dynamic Next.js page makes all its data work offline. Add explicit strategies for safe public GET data and use IndexedDB for offline drafts.

Register the worker once. Create `src/components/PwaRegister.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return null;
}
```

Render `<PwaRegister />` once inside the root layout body. Do not register a worker in each module.

## 6. API route conventions

Use Route Handlers such as `src/app/api/services/route.ts` for collection GET/POST and `src/app/api/services/[id]/route.ts` for item GET/PATCH/DELETE.

Every route should:
- validate fields and ObjectId values,
- check authentication, role, and ownership,
- return appropriate HTTP status codes,
- avoid trusting client-supplied owner IDs or roles.

## 7. Run and verify

```bash
npm run dev
```

Verify `/manifest.webmanifest`, `/sw.js`, icons, and the worker in browser DevTools → Application. Test offline after first loading online. Before submission:

```bash
npm run build
npm start
```

Service workers require a secure context; localhost counts as secure for development.
