import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** better-auth の表。日時はミリ秒の整数で持つ */
const id = () => text("id").primaryKey();
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () =>
  timestamp("createdAt")
    .$defaultFn(() => new Date())
    .notNull();
const updatedAt = () =>
  timestamp("updatedAt")
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull();

export const user = sqliteTable("User", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable(
  "Session",
  {
    id: id(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").unique().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull(),
  },
  (table) => [index("Session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "Account",
  {
    id: id(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("Account_userId_idx").on(table.userId),
    uniqueIndex("Account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = sqliteTable("Verification", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
