# Laptop sticker auction

Next.js + Supabase + Stripe. Companies bid on sticker spots on the MacBook lid, highest bid wins after 7 days, the winner's saved card is charged automatically.

## Setup, roughly 20 minutes

1. **Supabase**
   - New project → SQL editor → paste and run `supabase/migrations/001_schema.sql`.
   - Authentication → Providers → Email: turn *Confirm email* off if you want signups without the confirmation click (recommended for a 7 day campaign).
   - Authentication → URL configuration: set Site URL to your domain and add `https://yourdomain/auth/callback` to the redirect list.
   - Project Settings → API: copy URL, anon key, service role key into `.env`.

2. **Stripe**
   - Developers → API keys: copy publishable + secret key into `.env`. Use **test keys** first, place a few bids with card `4242 4242 4242 4242`, then switch to live.
   - Developers → Webhooks → Add endpoint: `https://yourdomain/api/stripe/webhook`, events `payment_intent.succeeded`, `payment_intent.payment_failed` and `checkout.session.completed` (Prime tickets). Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

3. **Emails (optional)**: create a Resend account, verify your domain, put the key in `RESEND_API_KEY`. Without it the app runs fine, just no outbid / winner emails.

4. **Vercel**
   - Push this folder to a GitHub repo, import it in Vercel.
   - Add every variable from `.env.example` in Project → Settings → Environment Variables. `CRON_SECRET`: any long random string, Vercel sends it automatically to the cron route.
   - The cron in `vercel.json` runs every 5 minutes and closes ended spots. It only works on the production deployment.

5. **Fonts**: drop `Satoshi-Variable.woff2` into `public/fonts/`. Falls back to Inter/system if missing.

## Changing the auction

- Slot sizes, positions, minimum bids and end time live in the `slots` table. Positions are in millimetres from the top left of the lid.
- To set a fixed end: `update slots set ends_at = '2026-09-20 18:00:00+02';`
- Bid steps: max($25, 10 %). Change in `place_bid()` and `lib/format.ts` (both places).
- Anti sniping window: 10 minutes, in `place_bid()`.

## Prime raffle

- The Prime slot (`kind = 'prize'`) is never auctioned. `/prime` shows locked until every other slot is `paid`.
- Tickets are sold via Stripe Checkout, recorded by the webhook in `prime_tickets`. Price in `lib/format.ts` (`TICKET_PRICE_CENTS`).
- Draw in `/admin`: one random ticket, tickets of paid spot winners count twice. Runs once.
- Free entries (no purchase necessary) you add by hand, see the SQL hint in `/admin`.

## How money flows

- Bidding saves and verifies the card with a SetupIntent. No charge, no hold.
- When a spot ends, the cron creates an off session PaymentIntent for the leading bid. Idempotent per bid, so a second cron run can't double charge.
- If the card declines the slot is marked `failed` and the winner gets an email to sort it out manually. You see it in `/admin`.

## Security notes

- Bids are only written through the `place_bid()` Postgres function (row locked, checks min bid, checks slot open). Clients have no insert rights.
- The API verifies the Stripe payment method belongs to the logged in user's customer before accepting a bid.
- `/admin` and the CSV export only work for `ADMIN_EMAIL`.
- Service role key is only used in server routes.
