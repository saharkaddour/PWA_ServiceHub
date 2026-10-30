/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "..");
function loadTs(file, mocks, env = {}, globals = {}) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: loaded.exports, module: loaded, URL, Buffer, setTimeout, clearTimeout,
    console: { error() {} }, process: { env },
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("node:")) return require(name);
      throw new Error(`Unexpected import: ${name}`);
    },
    ...globals,
  }, { filename: file });
  return loaded.exports;
}

function worker(windows = []) {
  const handlers = {};
  const notifications = [];
  const opened = [];
  let cacheOpened = false;
  const self = {
    location: { origin: "https://servicehub.test" },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    registration: { showNotification: async (title, options) => notifications.push({ title, ...options }) },
  };
  const clients = { matchAll: async () => windows, openWindow: async (url) => opened.push(url) };
  vm.runInNewContext(fs.readFileSync(path.join(root, "public/sw.js"), "utf8"), {
    self, clients, URL, Response, fetch: async () => { throw new Error("Network request should not occur"); },
    caches: { open: async () => ({ addAll: async (urls) => {
      cacheOpened = true;
      assert.deepEqual(Array.from(urls), ["/offline"]);
    } }) },
  });
  self.skipWaiting = async () => {};
  return { handlers, notifications, opened, installed: () => cacheOpened };
}

async function dispatch(handler, event = {}) {
  let pending;
  handler({ ...event, waitUntil(promise) { pending = promise; } });
  await pending;
}

test("worker installs without requesting missing home/login pages", async () => {
  const w = worker();
  await dispatch(w.handlers.install);
  assert.equal(w.installed(), true);
});

test("push displays a booking notification and survives malformed data", async () => {
  const w = worker();
  await dispatch(w.handlers.push, { data: { json: () => ({ title: "New booking", body: "Plumbing", tag: "booking-1" }) } });
  assert.equal(w.notifications[0].body, "Plumbing");
  assert.equal(w.notifications[0].tag, "booking-1");
  assert.equal(w.notifications[0].data.url, "/bookings");
  await dispatch(w.handlers.push, { data: { json: () => { throw new Error("Bad JSON"); } } });
  assert.equal(w.notifications[1].title, "New booking request");
});

test("click opens bookings when no window exists and blocks external links", async () => {
  const w = worker();
  let closed = 0;
  for (const url of ["/bookings", "https://other.test", "http://["]) {
    await dispatch(w.handlers.notificationclick, { notification: { data: { url }, close() { closed++; } } });
  }
  assert.equal(closed, 3);
  assert.deepEqual(w.opened, Array(3).fill("https://servicehub.test/bookings"));
});

test("click awaits navigation before focus and recovers from a closed window", async () => {
  const order = [];
  const w = worker([{ navigate: async (url) => {
    order.push(url);
    return { focus: async () => order.push("focus") };
  }, focus() {} }]);
  await dispatch(w.handlers.notificationclick, { notification: { close() {} } });
  assert.deepEqual(order, ["https://servicehub.test/bookings", "focus"]);
  assert.equal(w.opened.length, 0);
  const closed = worker([{ navigate: async () => { throw new Error("Window closed"); }, focus() {} }]);
  await dispatch(closed.handlers.notificationclick, { notification: { close() {} } });
  assert.deepEqual(closed.opened, ["https://servicehub.test/bookings"]);
});

test("worker leaves authenticated API requests and private messages pages to the network", () => {
  const w = worker();
  for (const pathname of ["/api/auth/me", "/api/messages", "/messages", "/messages?booking=b1"]) {
    w.handlers.fetch({ request: { method: "GET", url: `https://servicehub.test${pathname}` }, respondWith() {
      assert.fail("Private responses must not be cached");
    } });
  }
});

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test",
  keys: { p256dh: Buffer.alloc(65, 4).toString("base64url"), auth: Buffer.alloc(16, 1).toString("base64url") },
};
const vapid = { VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_KEY: "private", VAPID_SUBJECT: "mailto:admin@example.com" };
const dbMock = (collection) => Promise.resolve({ db: () => ({ collection: () => collection }) });

test("subscription validation rejects malformed keys, local URLs and lookalike domains", () => {
  const push = loadTs("src/lib/push.ts", { "web-push": {}, "@/lib/db/mongodb": dbMock({}) });
  assert.equal(push.parsePushSubscription(subscription).endpoint, subscription.endpoint);
  for (const endpoint of ["http://fcm.googleapis.com/test", "https://localhost/test", "https://127.0.0.1/test", "https://fcm.googleapis.com.evil.test/test", "https://user@fcm.googleapis.com/test"]) {
    assert.equal(push.parsePushSubscription({ ...subscription, endpoint }), null);
  }
  assert.equal(push.parsePushSubscription({ ...subscription, keys: { auth: "bad", p256dh: "bad" } }), null);
  assert.equal(push.parsePushSubscription(null), null);
});

test("server targets provider devices, removes expired subscriptions and tolerates delivery failure", async () => {
  const devices = ["ok", "expired", "unavailable"].map((_id) => ({ _id, subscription: { ...subscription, endpoint: _id } }));
  const deleted = [];
  let provider;
  const sent = [];
  const push = loadTs("src/lib/push.ts", {
    "@/lib/db/mongodb": dbMock({ find: (filter) => { provider = filter.userId; return { toArray: async () => devices }; }, deleteOne: async (filter) => deleted.push(filter._id) }),
    "web-push": { sendNotification: async (sub, payload) => {
      if (sub.endpoint === "expired") throw { statusCode: 410 };
      if (sub.endpoint === "unavailable") throw { statusCode: 503 };
      sent.push(JSON.parse(payload));
    } },
  }, vapid);
  await push.notifyProviderOfBooking({ id: "b1", providerId: "provider-1", serviceTitle: "Repair" });
  assert.equal(provider, "provider-1");
  assert.deepEqual(deleted, ["expired"]);
  assert.equal(sent[0].url, "/bookings");
  assert.equal(sent[0].tag, "servicehub-booking-b1");
});

test("booking retries do not send push twice and push failure preserves a saved booking", async () => {
  let saved;
  let deliveries = 0;
  const bookings = loadTs("src/lib/bookings.ts", {
    "@/lib/db/mongodb": dbMock({ createIndex: async () => {}, findOne: async () => saved ?? null, insertOne: async (document) => { saved = document; } }),
    "@/lib/push": { notifyProviderOfBooking: async () => { deliveries++; throw new Error("Push offline"); } },
  });
  const input = { serviceId: "s1", serviceTitle: "Repair", customerId: "c1", providerId: "p1", preferredDate: "2026-12-01", note: "", clientRequestId: "request-1" };
  const first = await bookings.createBooking(input);
  const retried = await bookings.createBooking(input);
  assert.equal(first.id, retried.id);
  assert.equal(first.status, "PENDING");
  assert.equal(deliveries, 1);
});

test("browser marks push active only after the server saves the subscription", async () => {
  let saveSucceeds = false;
  const client = loadTs("src/lib/notifications-client.ts", {}, {}, {
    window: { PushManager: {} },
    navigator: { serviceWorker: {
      register: async () => {},
      ready: Promise.resolve({ pushManager: { getSubscription: async () => ({ toJSON: () => subscription }) } }),
    } },
    fetch: async (_url, options) => options.method === "POST" ? { ok: saveSucceeds } : { ok: true, json: async () => ({ publicKey: "test" }) },
  });
  await assert.rejects(client.connectPush(false), /could not be enabled/);
  assert.equal(client.hasActivePush(), false);
  saveSucceeds = true;
  assert.equal(await client.connectPush(false), true);
  assert.equal(client.hasActivePush(), true);
});

test("without server push keys the browser keeps the foreground fallback", async () => {
  const client = loadTs("src/lib/notifications-client.ts", {}, {}, {
    window: { PushManager: {} },
    fetch: async () => ({ ok: true, json: async () => ({ publicKey: null }) }),
  });
  assert.equal(await client.connectPush(true), false);
  assert.equal(client.hasActivePush(), false);
});

test("subscription API rejects non-providers and cross-origin writes", async () => {
  let user = { id: "customer-1", role: "CUSTOMER" };
  let saves = 0;
  const route = loadTs("src/app/api/notifications/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "session" }) }) },
    "next/server": { NextResponse: Response },
    "@/lib/auth": { SESSION_COOKIE: "session", getUserFromSession: async () => user },
    "@/lib/push": {
      getPushConfig: () => ({ publicKey: "public" }),
      parsePushSubscription: () => subscription,
      savePushSubscription: async () => saves++,
    },
  });
  const request = (origin) => new Request("https://servicehub.test/api/notifications", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(subscription),
  });
  assert.equal((await route.GET()).status, 403);
  assert.equal((await route.POST(request("https://servicehub.test"))).status, 403);
  user = { id: "provider-1", role: "PROVIDER" };
  assert.equal((await route.POST(request("https://other.test"))).status, 403);
  const config = await route.GET();
  assert.equal(config.headers.get("Cache-Control"), "no-store");
  assert.equal((await route.POST(request("https://servicehub.test"))).status, 200);
  assert.equal(saves, 1);
});
