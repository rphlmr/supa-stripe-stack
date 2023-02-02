<h1 align="center">Remix Supa Stripe Stack</h1>

<p align="center">
  <a href="https://twitter.com/rphlmr">Twitter</a>
  <br/>
  <br/>
  A Remix & Stripe Stack, backed by Supabase (driven by Prisma), that integrates authentication, subscriptions (multi-currency, month and year intervals) and handling tier limit. 
</p>
<p align="center">
  Remix deploy target: Fly.io 
</p>
<p align="center">
  <b>Disclaimer</b>: This stack gives you a good starting point but it can't handle a specific business model. You'll need to adapt it to your needs and you must understand how Stripe works before going to production.
</p>

![supa-stripe-stack](https://user-images.githubusercontent.com/20722140/216357731-806840c9-03f0-4ee5-a3cc-f12382b4bc88.png)


> I want to thank and credit [DevXO](https://github.com/dev-xo) for its work on [Stripe Stack](https://github.com/dev-xo/stripe-stack) which helped me a lot to build the webhook part of this stack.

Learn more about [Remix Stacks](https://remix.run/stacks).

```sh
npx create-remix --template rphlmr/supa-stripe-stack
```

## What's in the stack

### Features

- Authentication (email/password) with [Supabase](https://supabase.com/)
- Subscriptions (default: `free`, `tier_1`, `tier_2`) with [Stripe](https://stripe.com/)
  - Multi-currency (default: `usd` and `eur`)
  - Interval (default: `month` and `year`)
- A taking notes app demo with tier limits on the max number of notes (default: `free` = 2, `tier_1` = 4, `tier_2` = infinite)

### Tools

- [Fly app deployment](https://fly.io) with [Docker](https://www.docker.com/products/docker-desktop/)
- Production-ready [Supabase Database](https://supabase.com/)
- Healthcheck endpoint for [Fly backups region fallbacks](https://fly.io/docs/reference/configuration/#services-http_checks)
- Email/Password Authentication with [cookie-based sessions](https://remix.run/docs/en/v1/api/remix#createcookiesessionstorage)
- Database ORM with [Prisma](https://prisma.io)
- Forms Schema (client and server sides !) validation with [Zod](https://github.com/colinhacks/zod) and [React Zorm](https://github.com/esamattis/react-zorm)
- Styling with [Tailwind](https://tailwindcss.com/)
- Code formatting with [Prettier](https://prettier.io)
- Linting with [ESLint](https://eslint.org)
- Static Types with [TypeScript 4.9](https://typescriptlang.org)

## What's not in the stack

- Unit Testing 😶 (will try to add it)
- E2E Testing 😶 (will try to add it with [Playwright](https://playwright.dev/)))
- GitHub Actions

## Why Supabase?

I love it.

# Requirements

## #1 Supabase project

- Create a [Supabase database](https://supabase.com/) (the free tier gives you 2 databases)

  > It'll ask you to define the `Database Password`. Save it somewhere, you'll need it later.

  ![create_project](https://user-images.githubusercontent.com/20722140/216093400-405916ae-7c30-4aa1-8c73-b41a512f1507.png)

- Go to https://app.supabase.io/project/{PROJECT}/settings/database to find your database secrets

  ![database_secrets](https://user-images.githubusercontent.com/20722140/216097216-f77a56ac-b17e-4031-bd29-ad239639829d.png)

  - It's time to copy/paste some secrets from this page 👆 into your `.env` file
  - `URI` 👉 `DATABASE_URL`
    - Replace `[YOUR-PASSWORD]` with your `Database Password` (from the previous step)

- Go to https://app.supabase.io/project/{PROJECT}/settings/api to find your API secrets

  ![project_secrets](https://user-images.githubusercontent.com/20722140/216094297-df265aaf-1c50-4dc7-bdd0-14bc8aa00e17.png)

  - It's time to copy/paste some secrets from this page 👆 into your `.env` file
  - `URL` 👉 `SUPABASE_URL`
  - `anon` `public` 👉 `SUPABASE_ANON_PUBLIC`
  - `service_role` `secret` 👉 `SUPABASE_SERVICE_ROLE`

## #2 Stripe project

> You'll also need to install the [Stripe CLI](https://stripe.com/docs/stripe-cli) to test the webhook locally

> This CLI gives you the ability to listen Stripe webhook events and forward them to your local server.

- Create a [Stripe account](https://dashboard.stripe.com/register)
- Go to https://dashboard.stripe.com/test/apikeys

  ![stripe_secrets](https://user-images.githubusercontent.com/20722140/216101036-1e94b7fe-29e6-4f34-85eb-9e0f7c0002a4.png)

  - It's time to copy/paste some secrets from this page 👆 into your `.env` file
  - `Secret key` 👉 `STRIPE_SECRET_KEY`

- As long as you're here, and let's assume you've installed the Stripe CLI, you can run the following command to start Stripe webhook listener and get your `webhook signing secret`
  ```sh
  stripe listen --forward-to localhost:3000/api/webhook
  ...
  > Ready! You are using Stripe API Version [2022-11-15]. Your webhook signing secret is whsec_d7f96cbdb268xxxxxxxxxxxxxxxx
  ```
  - `whsec_d7f96cbdb268xxxxxxxxxxxxxxxx` 👉 `STRIPE_ENDPOINT_SECRET`

## #3 Fly project

TODO
In the meantime, you can look at [my other stack working with Fly](https://github.com/rphlmr/supa-fly-stack/blob/main/README.md#deployment)

## #4 Environment variables

There are other environment variables you can set in your `.env` file.

- `SERVER_URL`: the URL of your server (`http://localhost:3000` in local env)
- `SESSION_SECRET`: a secret string used to encrypt your session cookie
- `DEFAULT_CURRENCY`: default currency for your Stripe subscriptions if the user currency is not supported. (only used for UI purposes)
  > **Note**:
  >
  > The currency we show on the Pricing page is based on the user locale.See [getDefaultCurrency](app/utils/http.server.ts)
  >
  > It's not reliable because Stripe checkout will choose a currency based on the user's IP address.
  >
  > You can implement a better solution by using geo-ip services.
  >
  > **After the user subscribe, we'll use the currency selected by Stripe**.

# How it works

TODO: explain the stack

TODO: explain the pricing plan

TODO: explain how to make this stack your own

# Development

It's time to play with the stack 🎉

> ⚠️ This step only applies if you've opted out of having the Remix CLI install dependencies for you:
>
> ```sh
> npx remix init
> ```

The default pricing plan included in this stack can be found in [`scripts/config/index.ts`](scripts/config/index.ts)

## Seed the database and Stripe

```sh
npm run setup
```

## Start Stripe Webhook listener

**It is mandatory to test the webhook locally.**

Stripe sends webhook events to your server when a customer subscribes, cancels, or updates their subscription.

Stripe events are sent to the [`/api/webhook`](app/routes/api/webhook.ts) endpoint.

```sh
stripe listen --forward-to localhost:3000/api/webhook
```

## Start the server

```sh
npm run dev
```

# Notes

Test credit card: `4242424242424242` Date `12/33` CVC `123`

More cards: https://stripe.com/docs/testing?testing-method=card-numbers#cards
