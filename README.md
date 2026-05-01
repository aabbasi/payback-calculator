# Haval H6: Petrol vs HEV Payback Calculator

A small web app that answers: **"how long until the Haval H6 HEV premium pays for itself in fuel savings?"**

Every time you open it, it fetches the current Pakistan petrol price, asks for your monthly mileage and city/motorway split, and computes payback time using real-world fuel economy figures for both variants.

🔗 **Live app:** https://aabbasi.github.io/payback-calculator/

## Install it on your iPhone (no App Store needed)

1. Open the live link above in **Safari** on your iPhone.
2. Tap the **Share** button (square with an up arrow).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**.

You now have an app icon on your home screen that opens full-screen, works offline, and looks native. Android users can do the same from Chrome → **Add to Home screen**.

## What it calculates

For three scenarios — **100% city**, **100% motorway**, and **your custom mix** — it shows:
- Monthly fuel cost for the Petrol 1.5T
- Monthly fuel cost for the HEV
- Monthly savings
- Years to break even on the PKR ~2.65M HEV premium (factoring in fuel-price inflation)

Then it delivers a plain-language verdict: go HEV, close call, or stick with Petrol.

## Default assumptions (all editable in Advanced)

| Input | Default | Source |
|---|---|---|
| Petrol price | PKR 393.35/L (live-fetched on load) | [Business Recorder, Apr 2026](https://www.brecorder.com/news/40418122) |
| H6 1.5T price | PKR 9,099,000 | [PakWheels](https://www.pakwheels.com/new-cars/pricelist/haval) |
| H6 HEV price | PKR 11,749,000 | [PakWheels](https://www.pakwheels.com/new-cars/pricelist/haval) |
| Petrol 1.5T — city km/L | 9 | Owner reports |
| Petrol 1.5T — motorway km/L | 13 | Owner reports |
| HEV — city km/L | 19 | Manufacturer spec (5.2 L/100km combined) |
| HEV — motorway km/L | 16 | Real-world reports (HEVs lose their advantage at highway speeds) |
| Annual fuel inflation | 8% | Pakistan historical average |

## What it explicitly does *not* model

- **Battery replacement cost** — typically due in year 8–10, significant expense
- **Resale value** differences
- **Maintenance** differences
- **Opportunity cost** — PKR 2.65M invested at 15%+ could outpace fuel savings at low mileage
- **Feature/trim differences** between the two variants

These are called out in the app itself.

## Running locally

No build step. Serve it with any static file server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Opening `index.html` directly via `file://` mostly works, but browsers block the service worker and some fetches in that mode — serving locally is recommended for full functionality.

## How it's deployed

GitHub Pages, serving the `main` branch directly (configured under **Settings → Pages → Deploy from a branch**). Any push to `main` is published automatically within a minute or two.

## Files

- `index.html` — markup & PWA wiring
- `styles.css` — dark-mode, responsive, iPhone-safe-area aware
- `app.js` — fetch + calculator logic
- `manifest.json` — PWA manifest
- `sw.js` — service worker for offline caching
- `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — icons

## Notes on the live petrol price fetch

Browsers block cross-origin HTML scraping, so the app routes through a public CORS proxy ([allorigins.win](https://allorigins.win)) to pull the latest price from Business Recorder or HamariWeb. If both sources fail, it falls back to a recent known figure. You can always override manually in the Advanced panel.
