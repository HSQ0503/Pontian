# Pontian

Next.js 16, Tailwind 4, framer-motion. Three routes: `/` (the landing page, built on the brand guidelines in `src/app/(landing)` and `src/components/landing`), `/contact`, `/story` (the interactive presentation, unlisted). `/story/print` is the PDF source.

```bash
npm install
npm run dev
```

## Things to swap

- `src/lib/site.ts`: domain and phone number (used for the call link and WhatsApp). Env vars `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_PHONE` override them on Vercel.
- `src/lib/content.ts`: every word on the site, PT and EN.
- Shouqi Serif: drop `ShouqiSerif-Regular.woff2` and `ShouqiSerif-SemiBold.woff2` into `public/shouqi-serif/fonts/`. Until then headings fall back to Source Serif 4.

## Regenerate the exports

With `npm run dev` running on port 3000:

```bash
npm run export:pdf   # public/pontian-pt.pdf and public/pontian-en.pdf
npm run export:og    # public/og.png
```

Pass another base URL as the first argument if the server is elsewhere: `node scripts/export-pdf.mjs http://localhost:3200`.

## Intake verification

The Get Started quiz and `/contact/skorman` use Cloudflare Turnstile. Configure a managed widget for `pontian.co` (which also covers `www.pontian.co`). If the Vercel alias is used, add `pontian.vercel.app` explicitly. Set these in the Vercel project and redeploy:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: the widget's public site key, available during the build.
- `TURNSTILE_SECRET_KEY`: its matching secret, available only to the server.

The API requires Cloudflare to return `success: true`, the `intake` action, and the same hostname as the submission. Missing configuration, failed checks, expired tokens, and production test keys are rejected before delivery. The widget refreshes expired tokens and can retry loading without clearing the visitor's answers.

For local development, explicitly set Cloudflare's published test site key and matching test secret in `.env.local`. There is no automatic test-key fallback. Test keys work only with `npm run dev`; they are rejected by a production build. Never commit real secrets.

`PONTIAN_INTAKE_WEBHOOK_URL` remains the separate HTTPS destination for accepted submissions. `PONTIAN_INTAKE_WEBHOOK_TOKEN` is optional bearer authentication for that destination. A verified CAPTCHA does not connect form delivery by itself.

Run the server-side regression checks with `npm run test:intake`. They mock verification and delivery, so no inquiries are sent.
