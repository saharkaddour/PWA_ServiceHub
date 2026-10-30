# ServiceHub — Project Context

## Idea
ServiceHub is a simple, mobile-first Progressive Web App built with **Next.js, TypeScript, and MongoDB**. It connects customers with local service providers and suppliers. The university validation should demonstrate responsive UI, installability, offline behavior, and basic CRUD with simple business rules.

## Keep the scope small
Prefer short forms, clear buttons, and a few screens. Do not build payments, maps, advanced search, analytics dashboards, complex calendars, inventory systems, or a full admin panel unless the teacher explicitly requires them.

## Roles
- **Customer:** views services, requests a service, messages a provider, reviews completed work, submits reports.
- **Provider:** creates/manages service listings and accepts/rejects booking requests.
- **Supplier:** creates/manages supplier listings.
- **Moderator:** views reports and marks them resolved/dismissed; this can be a seeded demo account.

## Six members

| Member | Feature | Minimum functionality | PWA responsibility |
|---|---|---|---|
| 1 | Identity & Profiles | View/edit a small profile; demo sign-in/out | Cache safe profile snapshot for offline viewing |
| 2 | Services & Catalog | Provider CRUD; customer views published services | Cache recently viewed public service details |
| 3 | Supplier Management | Supplier listing CRUD | Save/restore an unfinished listing form draft |
| 4 | Booking & Requests | Customer requests; provider accepts/rejects | Queue offline bookings as Pending sync and retry |
| 5 | Messaging & Notifications | Simple messages grouped by booking | Display local notification and handle click; real push optional |
| 6 | Reviews & Reports | Rating/comment, submit report, moderator status update | Save/restore review/report drafts; optional retry after reconnect |

Every member should own a small UI, API/database operations, validation, tests, and their offline feature. Agree on shared types and API contracts before parallel development.

## Main journey
1. Provider publishes a service.
2. Customer views it and requests a booking.
3. Provider accepts/rejects.
4. Customer/provider exchange a simple message.
5. After completion, customer leaves a review.
6. A user can report inappropriate content; moderator updates status.
7. Supplier independently maintains supplier listings.
8. Demonstrate offline behavior and synchronization.

## Suggested entities
- `User`: `name`, `email`, `role`
- `Service`: `title`, `description`, `price`, `category`, `providerId`
- `SupplierListing`: `name`, `description`, `category`, `price`, `supplierId`
- `Booking`: `serviceId`, `customerId`, `providerId`, `preferredDate`, `status`, `clientRequestId`
- `Message`: `bookingId`, `senderId`, `text`, `createdAt`
- `Review`: `bookingId`, `customerId`, `rating`, `comment`
- `Report`: `reporterId`, `targetType`, `targetId`, `reason`, `status`

## Booking statuses
`PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `COMPLETED`.

Allowed transitions: `PENDING → ACCEPTED/REJECTED/CANCELLED`; `ACCEPTED → CANCELLED/COMPLETED`. Validate transitions in the API.

## Validation checklist
- [ ] Manifest and 192×192 / 512×512 icons
- [ ] One service worker registered once
- [ ] Offline fallback and at least one offline feature per member
- [ ] Mobile-first responsive layout
- [ ] CRUD persists in MongoDB
- [ ] Offline writes are labelled Draft/Pending sync until server confirmation

## Definition of done
Main user story works; server validates input and permissions; MongoDB data persists; offline behavior is demonstrable; loading/empty/error/success states exist; phone and desktop layouts work.
