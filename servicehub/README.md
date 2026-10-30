This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Messages

Customers and providers can open **Messages** in the navigation or **Message about this booking** on a booking. Each booking has its own conversation, available before the first message is sent. Messages are stored in MongoDB and refreshed every five seconds while the page is visible. Drafts remain in the open page if sending fails; reloads do not preserve drafts.

Only the booking's customer and provider can read or send messages. The server derives the sender from the authenticated session and accepts messages of 1–2,000 characters. Private message pages and API responses are excluded from service worker caching. Messaging requires an online connection, a reachable MongoDB instance, and an existing authenticated customer/provider session.

## Booking notifications

Providers can enable notifications in the navigation. After browser permission is granted, a confirmation notification appears. New pending bookings are checked every five seconds while the app is open if background push is unavailable. All newly discovered requests are notified, and failed displays are retried on the next check.

To enable background push:

1. Run `npm install` in `servicehub`, then `npm run notifications:keys` once.
2. Create `servicehub/.env.local` with your database settings and generated keys:

   ```dotenv
   MONGODB_URI=your-mongodb-connection-string
   MONGODB_DB=servicehub
   VAPID_PUBLIC_KEY=generated-public-key
   VAPID_PRIVATE_KEY=generated-private-key
   VAPID_SUBJECT=mailto:your-real-contact-email@example.com
   ```

3. Restart the server. For hosting, set the same variables in the server environment. Keep the private key secret and keep the key pair stable across deploys.
4. Open the app as a logged-in provider and click **Enable notifications** (or **Enable background notifications** if permission was previously granted). The button shows **Notifications on** only after the browser subscription is saved to MongoDB.

The server sends an encrypted push when a new booking is inserted. Retrying an existing booking does not send another push. Subscription records persist in MongoDB; expired subscriptions are removed. Push failures do not fail the customer's booking. Clicking a notification opens `/bookings`, including when no app window exists.

Use HTTPS on hosted sites (localhost is supported for local development). On iPhone/iPad, install the app on the home screen before enabling notifications. Device/browser notification settings must allow delivery. See the [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps).

To verify delivery, enable notifications for a provider, create a booking for that provider from a separate customer session, then repeat with the provider's app tab closed. Without VAPID settings, only open-app notifications are available. `npm test` checks worker delivery/click handling, push validation/cleanup, and booking retry/failure behavior; it does not send a real push.

This checkout has no login or registration pages/routes, although session helpers and protected booking routes exist. An existing authenticated session and a reachable MongoDB instance are needed for the delivery check; notification changes do not implement the missing account flows.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
