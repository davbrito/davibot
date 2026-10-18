# Deployment

Deno Deploy builds and deploys automatically from GitHub. There is no manual deploy task:
`deno task deploy` was retired together with Deploy Classic.

- **App:** https://davibot.davbrito.deno.net/
- **Webhook:** `POST /`
- **Telegram webhook secret:** `BOT_SECRET` in the app environment

## Setting the webhook

The `post_webhook.ts` helper loads `.env` and asks for confirmation:

```sh
deno task webhook -- -u https://davibot.davbrito.deno.net/ -s "$BOT_SECRET" set
deno task webhook -- get
```

## Local checks

```sh
deno check --allow-import src/main.tsx
deno lint src tasks
deno task test
deno task bundle # optional: local Deno bundle
```
