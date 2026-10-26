/**
 * サーバーが読む設定。公開してよい値は wrangler.jsonc の vars、秘密の値は Workers のシークレット
 * (手元は .dev.vars)。項目の説明は .dev.vars.example
 */
interface AppEnv {
  VITE_PUBLIC_APP_URL: string;
  VITE_PUBLIC_TURNSTILE_SITE_KEY: string;
  /** 店の人向けの認証メールの送信元 */
  AUTH_EMAIL_FROM: string;
  /** 客に送るおすすめのメールの送信元 */
  LETTER_EMAIL_FROM: string;
  /** PayPal の REST API の入口 (サンドボックスは https://api-m.sandbox.paypal.com) */
  PAYPAL_API_BASE: string;
  /** おすすめを考える Claude のモデル */
  ANTHROPIC_MODEL: string;

  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  TURNSTILE_SECRET_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_EMAIL_API_TOKEN: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  /** メールのリンクに付ける署名の鍵 */
  LINK_SIGNING_SECRET: string;
}
