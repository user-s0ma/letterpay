# Letterpay

Recommendation emails your customers can pay from.

Letterpay reads each customer's purchase history and lets AI decide when to write to them, which product to suggest, how many and why. The email carries a **Pay with PayPal** button: opening it creates a PayPal order at today's price and sends the customer straight to PayPal checkout, with the address saved in their PayPal account. There is no store page in between.

The demo shop, **Hoshizora Coffee**, is a fictional roaster in Japan that sells beans abroad. Coffee runs out at a predictable pace and tastes show up in the order history, so it is a good fit for "the right coffee, right when you need it".

## How it works

1. **AI plans the next email.** When a customer buys or an email is sent, Claude reads that customer's purchases (what, how much, how often), the emails already sent and what happened to them, and the current product list (roast, origin, tasting notes, arrival date, stock). It returns structured JSON: the day to send, the product, the quantity, a reason written to the customer, and a reason for the day for the shop owner. It can also decide to stop writing to someone.
2. **Code checks the plan.** Before saving, Letterpay checks it against the shop: the date is after today, the product exists and is in stock, the quantity is what the customer usually buys. If a check fails, Claude is asked once more with the reason; if it fails again, nothing is planned.
3. **A daily job sends what is due.** A Cloudflare Cron Trigger runs every day and sends planned emails whose day has come. Customers without recorded consent, or who unsubscribed, are never planned or emailed.
4. **The link opens PayPal.** `GET /l/:token` verifies the signed link, creates an Orders v2 order (`intent: CAPTURE`, `shipping_preference: GET_FROM_FILE`, `user_action: PAY_NOW`) at the current price and redirects to the `payer-action` URL. The order is created on click, not when the email is sent, so prices are current and orders do not expire unused.
5. **Return and capture.** PayPal returns to `/l/:token/return`; Letterpay checks that the order is the one it created for that email, captures it, records the purchase, lowers stock and asks the AI to plan the next email.

## The shop owner's console

The main screen is an **AG Grid** table with one row per customer: consent, orders, the next email the AI planned (day, coffee, bags, reason, decided by AI or by you) and the result of the last email (sent, opened link, paid), plus revenue paid through emails. The day, coffee and quantity are editable in the grid; an edit gets the same checks, and when the coffee or quantity changes Claude rewrites the reason for the new choice. Products are also an editable AG Grid.

## Tech

- React Router 8 and Hono on **Cloudflare Workers**, with a Cron Trigger for the daily send
- **PayPal Orders v2** REST API (sandbox)
- **Claude** (`claude-sonnet-5-5` by default, set in `wrangler.jsonc`) through the Anthropic TypeScript SDK with structured outputs
- **AG Grid** Community for the console tables
- **Cloudflare D1** with Drizzle, better-auth (email and password), Cloudflare Turnstile
- Email through the Cloudflare Email Service Workers binding (`send_email`), with `List-Unsubscribe` one-click headers

## Run it locally

Requirements: Node.js 22, a Cloudflare account (D1, and Email Sending set up for your sender domain), a PayPal developer account with a sandbox REST app and an Anthropic API key.

```bash
npm install
cp .env.example .env            # public values for the pages
cp .dev.vars.example .dev.vars  # secrets; fill them in
npm run db:migrate:local        # create the tables in the local D1
npm run dev                     # http://localhost:5180
```

Set `AUTH_EMAIL_FROM` and `LETTER_EMAIL_FROM` in `wrangler.jsonc` to addresses on your sending domain. Sign up, open the console and press **Load demo shop**. The demo customers' addresses are your own address with `+name` added, so the emails arrive in your inbox. In **Shop**, set the PayPal account that receives payments to a sandbox business account, and pay with a sandbox personal account.

## Deploy

```bash
npx wrangler d1 create letterpay       # put the database_id in wrangler.jsonc
npm run db:migrate                     # create the tables in the remote D1
npx wrangler secret put BETTER_AUTH_SECRET   # and the other values in .dev.vars.example
npm run deploy
```

## Tests

```bash
npm run type-check && npm run lint && npm test
```

## License

Apache-2.0
