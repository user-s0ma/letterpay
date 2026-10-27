import {
  type RouteConfig,
  type RouteConfigEntry,
  route,
  index,
} from "@react-router/dev/routes";
import { MARKETING_PATHS } from "../lib/i18n/locales";

const file = (path: string) =>
  path === "/" ? "routes/_index.tsx" : `routes/${path.slice(1)}.tsx`;
const subPaths = MARKETING_PATHS.filter((p) => p !== "/");

const marketing: RouteConfigEntry[] = subPaths.map((path) =>
  route(path.slice(1), file(path)),
);

export default [
  index("routes/_index.tsx"),
  ...marketing,

  route("robots.txt", "routes/robots.txt.tsx"),
  route("sitemap.xml", "routes/sitemap.xml.tsx"),

  route("login", "routes/login.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),

  // メールのリンク: PayPal の支払い画面へ送る、戻ってきたら代金を受け取る、配信を止める
  route("l/:token", "routes/l.$token.tsx"),
  route("l/:token/return", "routes/l.$token.return.tsx"),
  route("l/:token/cancel", "routes/l.$token.cancel.tsx"),
  route("u/:token", "routes/u.$token.tsx"),

  route("app", "routes/app/_layout.tsx", [
    index("routes/app/_index.tsx"),
    route("products", "routes/app/products.tsx"),
    route("settings", "routes/app/settings.tsx"),
    route("account", "routes/app/account.tsx"),
  ]),

  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
