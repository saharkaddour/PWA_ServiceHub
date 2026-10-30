# Feature 2 — Services & Catalog (Member 2)

## Goal
Let providers manage simple service listings and let customers view published services.

## User stories
- As a provider, I can create a service with a title, description, category, and price.
- As a provider, I can list, edit, and delete/archive my services.
- As a customer, I can view published services and open service details.
- As a customer, I can reopen a recently viewed service while offline.

## Minimal UI
- `/services`: list published services.
- `/services/new`: form with **title, description, category, price**.
- `/services/[id]`: details page; reuse the form for editing.
- No image upload, advanced filters, maps, or complex search.

## Data
`Service`: `_id`, `title`, `description`, `category`, `price`, `providerId`, `status`, `createdAt`. Status: `PUBLISHED` or `ARCHIVED`.

## API
- `GET /api/services`, `POST /api/services`
- `GET /api/services/:id`, `PATCH /api/services/:id`, `DELETE /api/services/:id`

Validate title/category/non-negative price on the server. Check provider ownership before changes. Agree whether delete means hard delete or archive.

## Service-worker functionality: cache public service details
1. Cache a safe public service detail after a successful GET.
2. Offline, show the cached detail with **Offline copy — may be outdated**.
3. Never cache mutation requests as if the server accepted them.
4. If caching dynamic HTML is unreliable, cache public JSON or save the last-viewed item in IndexedDB.

## Done when
- [ ] Provider CRUD works and customer can read published services.
- [ ] Server checks ownership and validates price.
- [ ] Recently viewed service detail can be shown offline.
