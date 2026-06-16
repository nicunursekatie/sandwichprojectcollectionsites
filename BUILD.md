# Build & Deploy — Host Finder

The live Host Finder is `public/index.html`, served by Firebase Hosting at
**https://tsp-host-finder-tool.web.app/**.

It used to rely on two "live" tools loaded from the internet on every visit:

- **Babel** (`@babel/standalone`) — converted the JSX in `app.js` in the browser.
- **Tailwind** (`cdn.tailwindcss.com`) — generated CSS in the browser.

Both auto-updated themselves, and a Babel auto-update once took the whole site
down. We now **compile those at build time** instead, so production ships
finished, frozen files that can't get surprise-broken by a CDN.

## What you edit vs. what gets generated

| You edit (source)        | Build generates (do NOT edit by hand)         |
| ------------------------ | --------------------------------------------- |
| `public/app.js` (JSX)    | `public/app.build.js`  (compiled, minified)   |
| `public/tailwind.src.css`| `public/tailwind.build.css` (compiled CSS)    |
| `public/index.html`      | —                                             |
| `public/styles.css`      | — (plain CSS, shipped as-is)                  |

`public/index.html` loads the **generated** files (`app.build.js` and
`tailwind.build.css`).

## One-time setup

```bash
npm install
```

## After you change `public/app.js` (or any classes used in it / index.html)

```bash
npm run build
```

This regenerates `public/app.build.js` and `public/tailwind.build.css`.

Optional: bump the `?v=...` cache-busting values on the
`tailwind.build.css` and `app.build.js` tags in `public/index.html` so visitors
get the new files immediately instead of a cached copy.

While actively editing you can auto-rebuild on save:

```bash
npm run watch:js    # rebuilds app.build.js on every save to app.js
npm run watch:css   # rebuilds tailwind.build.css on every save
```

## Deploy

```bash
npm run build
firebase deploy --only hosting
```

(Pushing to the `main` branch also triggers the Firebase deploy GitHub Action.)

## Notes

- `react`, `react-dom`, Firebase, and the Google Maps marker clusterer are still
  loaded from CDNs, but they are **version-pinned**, so they won't change unexpectedly.
- Tailwind is pinned to v3 to match the look the site had under the old CDN.
- `public/feedback-viewer.html` is a separate internal tool that still uses the
  Tailwind CDN; it isn't part of the public Host Finder.
