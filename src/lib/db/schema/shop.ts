import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** 日時はミリ秒の整数、日付 (送る日・入荷日) は YYYY-MM-DD の文字列で持つ */
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

/** 店。1つのアカウントが1つの店を持つ */
export const shop = sqliteTable("Shop", {
  userId: text("userId").primaryKey(),
  name: text("name").notNull(),
  /** 店の郵便の住所。販促のメールに載せる (米国の CAN-SPAM 法、日本の特定電子メール法) */
  address: text("address").notNull(),
  /** 代金を受け取る PayPal のアカウント (注文の payee) */
  payeeEmail: text("payeeEmail").notNull(),
  /** 価格の通貨 (ISO 4217)。金額は最小単位の整数で持つ */
  currency: text("currency").notNull(),
  /** 1回の注文の送料 (通貨の最小単位。国によらず同じ) */
  shippingMinor: integer("shippingMinor").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const product = sqliteTable(
  "Product",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    /** 商品の説明 (店が書く文章)。AI はこれを読んで選ぶ */
    description: text("description").notNull(),
    /** 1個の量や形 (店が書く文章。例 "200 g bag"、"500 ml bottle") */
    size: text("size").notNull(),
    /** 1個の価格 (通貨の最小単位) */
    priceMinor: integer("priceMinor").notNull(),
    /** 在庫 (個) */
    stock: integer("stock").notNull(),
    /** 入荷日 (新しい商品をすすめるときの手がかり) */
    arrivedOn: text("arrivedOn").notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("Product_user_idx").on(table.userId)],
);

export const customer = sqliteTable(
  "Customer",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** 国 (ISO 3166-1 alpha-2) */
    country: text("country").notNull(),
    /** 広告メールの受け取りに同意した日時。null なら送らない */
    marketingConsentAt: timestamp("marketingConsentAt"),
    /** メールの配信を止めた日時 */
    unsubscribedAt: timestamp("unsubscribedAt"),
    /** AI が「もう送らない」と決めた日時と理由。新しく買われたら消す */
    lettersStoppedAt: timestamp("lettersStoppedAt"),
    lettersStoppedReason: text("lettersStoppedReason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("Customer_user_email_key").on(table.userId, table.email)],
);

/** 購入の記録。店から取り込んだものと、Letterpay で払われたものの両方 */
export const purchase = sqliteTable(
  "Purchase",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    customerId: text("customerId").notNull(),
    productId: text("productId").notNull(),
    /** 個数 */
    quantity: integer("quantity").notNull(),
    /** 1個の価格 (買ったときの値) */
    unitPriceMinor: integer("unitPriceMinor").notNull(),
    /** import / letterpay */
    source: text("source").notNull(),
    /** Letterpay で払われたときのメール */
    letterId: text("letterId"),
    purchasedAt: timestamp("purchasedAt").notNull(),
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
export const letter = sqliteTable(
  "Letter",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    customerId: text("customerId").notNull(),
    /** planned / sent / paid / canceled / failed */
    status: text("status").notNull(),
    /** 送る日 (UTC の日付) */
    sendOn: text("sendOn").notNull(),
    /** その日に送る理由 (AI) */
    timingReason: text("timingReason").notNull(),
    productId: text("productId").notNull(),
    quantity: integer("quantity").notNull(),
    /** メールに書く、その商品をすすめる理由 (AI) */
    reason: text("reason").notNull(),
    /** 店の人が日・商品・量を直したか */
    editedByOwner: integer("editedByOwner", { mode: "boolean" }).default(false).notNull(),
    sentAt: timestamp("sentAt"),
    /** メールのリンクを最初に開いた日時 */
    clickedAt: timestamp("clickedAt"),
    paidAt: timestamp("paidAt"),
    /** 最後に作った PayPal の注文と、そのときの1個の価格 */
    paypalOrderId: text("paypalOrderId"),
    checkoutUnitMinor: integer("checkoutUnitMinor"),
    paypalCaptureId: text("paypalCaptureId"),
    /** COMPLETED / PENDING。PENDING は客の支払いは済み、店の受け取りが待ちの状態 */
    paypalCaptureStatus: text("paypalCaptureStatus"),
    /** 払われた額 (送料込み) */
    paidMinor: integer("paidMinor"),
    error: text("error"),
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
