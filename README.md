# 🥔 SnackCheck

A quirky snack diary for your phone. Snap a snack, tell it what you think, and find it again months later.

**Live:** https://schwardtz.github.io/snackcheck/

## How it works

Tap **+** to log a snack: snap a photo (then drag the corners to crop away the surroundings), give it a name, tap the chips to rate it (tap the left half of a chip
for a half rating), jot down taste notes and pick a few taste tags. Tap **Edit** on any snack to change it.

Search is fuzzy across names, brands, tags and notes, with filters for category and taste tags.

Tap **3D** on any snack to see it as a spinnable package: chip bag, chocolate bar, snack box, can or popcorn tub
(depending on the category) with your photo on the front and its stats on the back. Drag to spin, pinch to zoom, **Flip** to
see the back.

Fun stuff: flying chips in the background (tap empty space!), parallax hero that follows your phone's tilt,
snack-confetti when you save, and shaking your phone picks a random favourite.

## Privacy

Everything is stored **only on your phone** (IndexedDB). No accounts, no servers.
Use Settings → Export now and then to back up your snacks and photos.

## Install on Android

Open the live URL in Chrome and tap **📲 Install** (or ⋮ → *Install app*).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/snackcheck/
npm run build      # outputs dist/
```

Pushing to `main` deploys via GitHub Actions (repo Settings → Pages → Source: **GitHub Actions**).

Stack: Vite, React, TypeScript, Dexie, three.js, Framer Motion, canvas-confetti, Fuse.js, vite-plugin-pwa.
