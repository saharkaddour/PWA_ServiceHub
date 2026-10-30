# Feature 4 — Booking & Service Requests (Member 4)

## Goal
Let a customer request a service and let the provider accept or reject it. Keep the form short.

## User stories
- As a customer, I can request a service with a preferred date and optional short note.
- As a provider, I can view incoming requests and accept/reject a pending request.
- As a customer, I can see the request status.
- If I submit offline, the request is saved as **Pending sync** and sent when connectivity returns.

## Minimal UI
A **Request service** button on service details; form fields: preferred date and optional note. `/bookings` lists requests and status. Provider sees Accept/Reject buttons for pending requests. No calendar integration, payments, or complex availability rules.

## Data
`Booking`: `_id`, `serviceId`, `customerId`, `providerId`, `preferredDate`, `note`, `status`, `clientRequestId`, `createdAt`.

Statuses: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `COMPLETED`.

## API
- `POST /api/bookings`
- `GET /api/bookings`
- `PATCH /api/bookings/:id` for permitted status changes

The server derives user identity from the session and validates status transitions. Do not trust IDs sent by the browser.

## Service-worker functionality: offline booking queue
1. If offline, save the request in IndexedDB with a generated `clientRequestId`.
2. Show **Pending sync**, never “confirmed”.
3. Retry when the app opens online or the `online` event fires. Background Sync is optional.
4. Server should use `clientRequestId` to avoid duplicate creates on retry.
5. Replace the pending local item with the server record on success; otherwise show **Sync failed — Retry**.

## Done when
- [ ] Customer can create requests and provider can accept/reject.
- [ ] API rejects invalid status transitions.
- [ ] Offline request is visibly pending and later syncs.
- [ ] Retrying does not create duplicate bookings.
