import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  datetime,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const createdAt = () =>
  datetime("createdAt", { mode: "date", fsp: 3 })
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .notNull();
const updatedAt = () =>
  datetime("updatedAt", { mode: "date", fsp: 3 })
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date())
    .notNull();

/** 店。1つのアカウントが1つの店を持つ */
export const shop = mysqlTable("Shop", {
  userId: varchar("userId", { length: 191 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  /** 代金を受け取る PayPal のアカウント (注文の payee) */
  payeeEmail: varchar("payeeEmail", { length: 191 }).notNull(),
  /** 価格の通貨 (ISO 4217)。金額は最小単位の整数で持つ */
  currency: varchar("currency", { length: 3 }).notNull(),
  /** 1回の注文の送料 (通貨の最小単位。国によらず同じ) */
  shippingMinor: int("shippingMinor").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const product = mysqlTable(
  "Product",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    origin: varchar("origin", { length: 120 }).notNull(),
    /** light / medium / dark */
    roast: varchar("roast", { length: 16 }).notNull(),
    /** 味の特徴 (店が書く文章) */
    notes: text("notes").notNull(),
    /** 1袋の量 (グラム) */
    bagGrams: int("bagGrams").notNull(),
    /** 1袋の価格 (通貨の最小単位) */
    priceMinor: int("priceMinor").notNull(),
    /** 在庫 (袋) */
    stock: int("stock").notNull(),
    /** 入荷日 (新しい豆をすすめるときの手がかり) */
    arrivedOn: date("arrivedOn", { mode: "string" }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("Product_user_idx").on(table.userId)],
);

export const customer = mysqlTable(
  "Customer",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    /** 国 (ISO 3166-1 alpha-2) */
    country: varchar("country", { length: 2 }).notNull(),
    /** 広告メールの受け取りに同意した日時。null なら送らない */
    marketingConsentAt: datetime("marketingConsentAt", { mode: "date", fsp: 3 }),
    /** メールの配信を止めた日時 */
    unsubscribedAt: datetime("unsubscribedAt", { mode: "date", fsp: 3 }),
    /** AI が「もう送らない」と決めた日時と理由。新しく買われたら消す */
    lettersStoppedAt: datetime("lettersStoppedAt", { mode: "date", fsp: 3 }),
    lettersStoppedReason: text("lettersStoppedReason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("Customer_user_email_key").on(table.userId, table.email)],
);

/** 購入の記録。店から取り込んだものと、Letterpay で払われたものの両方 */
export const purchase = mysqlTable(
  "Purchase",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    customerId: varchar("customerId", { length: 191 }).notNull(),
    productId: varchar("productId", { length: 191 }).notNull(),
    /** 袋の数 */
    quantity: int("quantity").notNull(),
    /** 1袋の価格 (買ったときの値) */
    unitPriceMinor: int("unitPriceMinor").notNull(),
    /** import / letterpay */
    source: varchar("source", { length: 16 }).notNull(),
    /** Letterpay で払われたときのメール */
    letterId: varchar("letterId", { length: 191 }),
    purchasedAt: datetime("purchasedAt", { mode: "date", fsp: 3 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("Purchase_customer_purchasedAt_idx").on(table.customerId, table.purchasedAt),
    uniqueIndex("Purchase_letter_key").on(table.letterId),
  ],
);

/**
 * 客に送るおすすめのメール。AI が「次に送る日・商品・量・理由」を決めて planned で作り、
 * 毎日の見回りで送る日になったものを送る。店の人は planned のうちに日・商品・量を直せる
 */
export const letter = mysqlTable(
  "Letter",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    customerId: varchar("customerId", { length: 191 }).notNull(),
    /** planned / sent / paid / canceled / failed */
    status: varchar("status", { length: 16 }).notNull(),
    /** 送る日 (UTC の日付) */
    sendOn: date("sendOn", { mode: "string" }).notNull(),
    /** その日に送る理由 (AI) */
    timingReason: text("timingReason").notNull(),
    productId: varchar("productId", { length: 191 }).notNull(),
    quantity: int("quantity").notNull(),
    /** メールに書く、その商品をすすめる理由 (AI) */
    reason: text("reason").notNull(),
    /** 店の人が日・商品・量を直したか */
    editedByOwner: boolean("editedByOwner").default(false).notNull(),
    sentAt: datetime("sentAt", { mode: "date", fsp: 3 }),
    /** メールのリンクを最初に開いた日時 */
    clickedAt: datetime("clickedAt", { mode: "date", fsp: 3 }),
    paidAt: datetime("paidAt", { mode: "date", fsp: 3 }),
    /** 最後に作った PayPal の注文と、そのときの1袋の価格 */
    paypalOrderId: varchar("paypalOrderId", { length: 64 }),
    checkoutUnitMinor: int("checkoutUnitMinor"),
    paypalCaptureId: varchar("paypalCaptureId", { length: 64 }),
    /** 払われた額 (送料込み) */
    paidMinor: int("paidMinor"),
    error: varchar("error", { length: 500 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("Letter_user_status_sendOn_idx").on(table.userId, table.status, table.sendOn),
    index("Letter_customer_createdAt_idx").on(table.customerId, table.createdAt),
    // 見回りで、全店の送る日になったものを探す
    index("Letter_status_sendOn_idx").on(table.status, table.sendOn),
  ],
);
