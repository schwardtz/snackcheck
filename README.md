# 🥔 SnackCheck

A quirky snack diary for your phone. Snap a snack, tell it what you think, and find it again months later.

**Live:** https://schwardtz.github.io/snackcheck/

## How it works

There's no form to fill in. You just type (or dictate) into the prompt bar:

- *"Tried Lay's Paprika, 4 stars, smoky but way too salty"*
- 📷 snap the bag + *"loved these, 5/5"*: Claude reads the packaging
- *"make the pretzels 3 stars"*, *"add 'great with beer' to the vinegar chips"*, *"delete the matcha wafer"*
- On a snack's page, *"this"* means that snack: *"I wouldn't buy this again"*

Claude (Opus 5.5) turns your message into add/update/delete actions on your collection.
Search is fuzzy across names, brands, tags and notes, with filters for category and taste tags.

Fun stuff: flying chips in the background (tap empty space!), parallax hero that follows your phone's tilt,
snack-confetti when you log something, and shaking your phone picks a random favourite.

## Privacy

- All snacks and photos are stored **only on your phone** (IndexedDB). Use Settings → Export to back up.
- Your Anthropic API key is stored only on your phone and sent directly to `api.anthropic.com`.
  Create one at [console.anthropic.com](https://console.anthropic.com/settings/keys). Each prompt costs a fraction of a cent.

## Install on Android

Open the live URL in Chrome and tap **📲 Install** (or ⋮ → *Install app*).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/snackcheck/
npm run build      # outputs dist/
```

Pushing to `main` deploys via GitHub Actions (repo Settings → Pages → Source: **GitHub Actions**).

Stack: Vite, React, TypeScript, Dexie, Framer Motion, canvas-confetti, Fuse.js, vite-plugin-pwa, Anthropic SDK.
