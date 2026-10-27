// 本番の Worker に秘密の値を入れる。値は画面に出さない。
// PayPal・Claude・Turnstile・デモの買い手のパスワードは .dev.vars から、
// ログインとメールのリンクの署名の鍵は、本番用に新しく作る。
// 使い方: node scripts/put-secrets.mjs
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const FROM_DEV_VARS = [
  "TURNSTILE_SECRET_KEY",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "ANTHROPIC_API_KEY",
  "DEMO_SANDBOX_BUYER_PASSWORD",
];
const GENERATED = ["BETTER_AUTH_SECRET", "LINK_SIGNING_SECRET"];

const devVars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
);

const secrets = {};
for (const name of FROM_DEV_VARS) {
  if (!devVars[name]) throw new Error(`${name} is empty in .dev.vars`);
  secrets[name] = devVars[name];
}
for (const name of GENERATED) secrets[name] = randomBytes(32).toString("base64url");

const result = spawnSync("npx", ["wrangler", "secret", "bulk"], {
  input: JSON.stringify(secrets),
  stdio: ["pipe", "inherit", "inherit"],
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
