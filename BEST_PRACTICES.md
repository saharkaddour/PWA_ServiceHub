# Best Practices — Next.js + MongoDB + PWA

## Stack and architecture
- Next.js App Router + TypeScript for frontend and backend.
- MongoDB using either the official Node.js driver or Mongoose; choose one.
- Use Route Handlers under `app/api/.../route.ts` for CRUD.
- Keep DB access in `lib/db/`; shared types/validation in `lib/`.
- Prefer Server Components; add `"use client"` only for browser APIs and interactions.
- Never import database code into Client Components.
- Put secrets in `.env.local`; never prefix secrets with `NEXT_PUBLIC_`.

## Keep features simple
- Forms should have roughly 3–5 fields.
- Use a list page with Add/Edit/Delete actions.
- Use plain inputs and buttons before adding a large UI library.
- Avoid complex wizards, uploads, maps, payments, advanced filters, and premature abstractions.
- Show loading, empty, validation, error, and success states.

## Backend safety
- Validate every request on the server.
- Use suitable statuses: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`.
- Check ownership before edits/deletes.
- Never trust client-supplied role, owner ID, price, or status without validation.
- Keep `.env.local` out of Git; commit `.env.example` with placeholders.
- Use dates for timestamps and add indexes only when useful.

## PWA: mobile and desktop
### Responsive UI
- Design phone-first; test around 360px, 768px, and 1280px.
- Use flexible widths, readable text, visible labels, and large tap targets.
- Avoid horizontal scrolling. Desktop can use a top navigation; mobile may use a compact menu.

### Manifest/installability
- Include `name`, `short_name`, `start_url`, `display`, `background_color`, `theme_color`, and icons.
- Provide valid 192×192 and 512×512 PNG icons.
- Serve deployed apps over HTTPS; localhost is suitable for development.

### Service worker
- Register **one shared service worker**. Each member contributes a handler/strategy; do not register six competing workers.
- Cache safe public GET data and static assets only.
- Never cache credentials, access tokens, or private reports.
- Use cache-first for versioned static assets; network-first for data that should be fresh.
- Version caches and delete old versions during activation.
- Never treat a cached POST/PUT/PATCH/DELETE as server-confirmed.
- Include an offline fallback. Cached Next.js HTML may not work for every dynamic page; cache selected public JSON or store data in IndexedDB where appropriate.

### Offline writes
- Prefer IndexedDB for durable drafts and queues.
- Show clear states: **Draft**, **Pending sync**, **Failed**, **Saved**.
- A queued request is not confirmed until the API responds successfully.
- Use a client-generated `clientRequestId` for create retries to avoid duplicates.
- If Background Sync is unsupported, retry when the app opens or the `online` event fires.
- Clear drafts only after confirmed success.

### Notifications
- Start with in-app or local service-worker notifications.
- Real Web Push requires VAPID keys, subscription storage, and a server endpoint; make it optional if time is short.
- Request permission after a clear user action.

## Test checklist
- CRUD works and persists after refresh.
- Users cannot edit other users' records.
- Offline reads match the documented cache strategy.
- Offline drafts/queues survive refresh.
- Retrying does not duplicate records.
- Manifest, icons, worker, and responsive layouts work.
