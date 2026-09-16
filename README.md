# Pontian

Next.js 16, Tailwind 4, framer-motion. Three routes: `/` (one line), `/contact`, `/story` (the interactive presentation, unlisted). `/story/print` is the PDF source.

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
