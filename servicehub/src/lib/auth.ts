import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { Collection } from "mongodb";
import clientPromise from "@/lib/db/mongodb";
import {
  profileRoles,
  type Profile,
  type ProfileRole,
} from "@/lib/profile-types";
export { profileRoles, type Profile, type ProfileRole } from "@/lib/profile-types";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export const SESSION_COOKIE = "servicehub_session";

type UserDocument = {
  _id: string;
  name: string;
  email: string;
  role: ProfileRole;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type SessionDocument = {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
};

export function isProfileRole(value: unknown): value is ProfileRole {
  return (
    typeof value === "string" &&
    (profileRoles as readonly string[]).includes(value)
  );
}

function getDatabase() {
  return clientPromise.then((client) =>
    client.db(process.env.MONGODB_DB ?? "servicehub"),
  );
}

async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const database = await getDatabase();
  return database.collection<UserDocument>("users");
}

async function getSessionsCollection(): Promise<Collection<SessionDocument>> {
  const database = await getDatabase();
  return database.collection<SessionDocument>("sessions");
}

function toProfile(user: UserDocument): Profile {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: ProfileRole;
}): Promise<Profile> {
  const users = await getUsersCollection();
  const now = new Date();
  const user: UserDocument = {
    _id: randomUUID(),
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };

  await users.insertOne(user);
  return toProfile(user);
}

export async function findUserByEmail(
  email: string,
): Promise<UserDocument | null> {
  const users = await getUsersCollection();
  return users.findOne({ email });
}

export async function getUserById(id: string): Promise<UserDocument | null> {
  const users = await getUsersCollection();
  return users.findOne({ _id: id });
}

export async function updateUserName(
  userId: string,
  name: string,
): Promise<Profile | null> {
  const users = await getUsersCollection();
  const result = await users.findOneAndUpdate(
    { _id: userId },
    { $set: { name, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? toProfile(result) : null;
}

export async function createSession(userId: string): Promise<string> {
  const sessions = await getSessionsCollection();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await sessions.insertOne({
    _id: randomUUID(),
    userId,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    createdAt: now,
  });
  return token;
}

export async function getUserFromSession(
  token: string | undefined,
): Promise<Profile | null> {
  if (!token) {
    return null;
  }

  const sessions = await getSessionsCollection();
  const session = await sessions.findOne({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    return null;
  }

  const user = await getUserById(session.userId);
  return user ? toProfile(user) : null;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) {
    return;
  }

  const sessions = await getSessionsCollection();
  await sessions.deleteOne({
    tokenHash: createHash("sha256").update(token).digest("hex"),
  });
}
