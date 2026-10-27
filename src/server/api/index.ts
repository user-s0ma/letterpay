import { Hono } from "hono";
import { cors } from "hono/cors";
import { translate } from "@/lib/i18n";
import authApi from "./auth";
import console_ from "./console";
import type { ApiEnv } from "./types";

const api = new Hono<ApiEnv>();

api.use(
  "*",
  cors({
    origin: (origin, c) => {
      const appUrl = c.env.VITE_PUBLIC_APP_URL;
      return origin === appUrl ? origin : null;
    },
    credentials: true,
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

api.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
});

api.route("/api/auth", authApi);
// 店の人の画面の API (ログインが要る)
api.route("/api", console_);

api.onError((error, c) => {
  console.error(error);
  return c.json({ message: translate("server.common.internalError") }, 500);
});

api.notFound((c) =>
  c.json({ message: translate("server.common.notFound") }, 404),
);

export default api;
