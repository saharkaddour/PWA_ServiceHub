/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function load(file, mocks) {
  const loaded = { exports: {} };
  const source = readFileSync(join(__dirname, "..", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  runInNewContext(outputText, {
    exports: loaded.exports, module: loaded, URL, process: { env: {} },
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("node:")) return require(name);
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return loaded.exports;
}

function api(user, createMessage = async (input) => ({ id: "message-1", ...input })) {
  return load("src/app/api/messages/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "session" }) }) },
    "next/server": { NextResponse: Response },
    "@/lib/auth": { SESSION_COOKIE: "session", getUserFromSession: async () => user },
    "@/lib/messages": { createMessage, listMessageConversations: async (id) => [{ bookingId: id, messages: [] }] },
  });
}

function request(body, origin = "https://servicehub.test") {
  return new Request("https://servicehub.test/api/messages", {
    method: "POST", headers: { origin, "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("messages API requires customer/provider sessions and never caches conversations", async () => {
  for (const user of [null, { role: "SUPPLIER" }, { role: "MODERATOR" }]) {
    const route = api(user);
    assert.equal((await route.GET()).status, 401);
    assert.equal((await route.POST(request({ bookingId: "b1", text: "Hello" }))).status, 401);
  }
  const response = await api({ id: "customer-1", role: "CUSTOMER" }).GET();
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.json()).conversations[0].bookingId, "customer-1");
});

test("message writes reject invalid bodies, blank/long messages and cross-origin requests", async () => {
  const route = api({ id: "p1", role: "PROVIDER" }, async () => assert.fail("Invalid message reached database"));
  for (const body of ["invalid JSON", null, [], {}, { bookingId: "b1", text: "  " }, { bookingId: "b1", text: "x".repeat(2001) }]) {
    assert.equal((await route.POST(request(body))).status, 400);
  }
  assert.equal((await route.POST(request({ bookingId: "b1", text: "Hello" }, "https://other.test"))).status, 403);
});

test("message sender comes from the session and inaccessible bookings return 404", async () => {
  const user = { id: "real-customer", role: "CUSTOMER" };
  const response = await api(user).POST(request({ bookingId: "b1", text: " Hello ", senderId: "impersonated-user" }));
  assert.equal(response.status, 201);
  const { message } = await response.json();
  assert.equal(message.senderId, "real-customer");
  assert.equal(message.text, "Hello");
  assert.equal((await api(user, async () => undefined).POST(request({ bookingId: "other-booking", text: "Hello" }))).status, 404);
  assert.equal((await api(user, async () => { throw new Error("Database down"); }).POST(request({ bookingId: "b1", text: "Hello" }))).status, 500);
});

test("conversation listing includes empty bookings and restricts messages to owned bookings", async () => {
  let bookingFilter;
  let messageFilter;
  const chain = (items) => ({ sort: () => ({ toArray: async () => items }) });
  const library = load("src/lib/messages.ts", {
    "@/lib/db/mongodb": Promise.resolve({ db: () => ({ collection: (name) => name === "bookings" ? {
      find: (filter) => { bookingFilter = filter; return chain([{ _id: "b1", serviceTitle: "Repair" }, { _id: "b2", serviceTitle: "Cleaning" }]); },
    } : {
      find: (filter) => { messageFilter = filter; return chain([{ _id: "m1", bookingId: "b1", senderId: "p1", text: "Hello", createdAt: new Date("2026-10-30T10:00:00Z") }]); },
    } }) }),
  });
  const conversations = await library.listMessageConversations("c1");
  assert.equal(JSON.stringify(bookingFilter), JSON.stringify({ $or: [{ customerId: "c1" }, { providerId: "c1" }] }));
  assert.equal(JSON.stringify(messageFilter), JSON.stringify({ bookingId: { $in: ["b1", "b2"] } }));
  assert.equal(conversations.length, 2);
  assert.equal(conversations[1].messages.length, 0);
  assert.equal(conversations[0].messages[0].createdAt, "2026-10-30T10:00:00.000Z");
});

test("database rejects messages from a user who is not a booking participant", async () => {
  let filter;
  const library = load("src/lib/messages.ts", {
    "@/lib/db/mongodb": Promise.resolve({ db: () => ({ collection: (name) => name === "bookings" ? {
      findOne: async (input) => { filter = input; return null; },
    } : { insertOne: async () => assert.fail("Unauthorized message inserted") } }) }),
  });
  assert.equal(await library.createMessage({ bookingId: "b1", senderId: "stranger", text: "Hello" }), undefined);
  assert.equal(JSON.stringify(filter), JSON.stringify({ _id: "b1", $or: [{ customerId: "stranger" }, { providerId: "stranger" }] }));
});
