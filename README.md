# The Castellan Method (fictional demonstration site)

A modern executive-consulting website for the fictional **Dr. Naomi Castellan**. Built to show front-end, TypeScript and Python skills, and designed to deploy on GitHub Pages.

> Everything here is invented: the person, firm, press outlets, statistics, testimonials and bookings.

## Stack

| Part | Tool |
|---|---|
| Framework | Astro (static output) |
| Interactive pieces | React islands (Apply modal, booking calendar, cohesion check) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Python at build time | `python/` scripts run by GitHub Actions |
| Python in the browser | Pyodide runs `public/py/cohesion_score.py` |
| Hosting | GitHub Pages via GitHub Actions |

## Run it locally

Requires Node 22+ and Python 3.9+.

```bash
npm install
npm run data     # runs the Python scripts that generate src/data/*.json
npm run dev      # http://localhost:4321/castellan-method/
```

Python tests:

```bash
python3 -m unittest discover -s python/tests
```

## How the Python works

1. **Build time (GitHub Actions).** `python/generate_slots.py` creates six weeks of demo booking slots with real time zones; `python/build_insights_index.py` computes reading times and related articles. The workflow runs both on every push and every Monday, so the calendar stays current.
2. **In the browser (Pyodide).** The Team Cohesion Check loads Pyodide only when someone starts the quiz, then calls `score_json()` in `public/py/cohesion_score.py`. A JavaScript fallback runs if Python cannot load.

## Deploy to GitHub Pages

1. Create a repo named `castellan-method` and push this folder to `main`.
2. In the repo: **Settings > Pages > Source: GitHub Actions**.
3. Push again (or run the workflow). The site appears at `https://<your-username>.github.io/castellan-method/`.

If you rename the repo, nothing needs to change: the workflow reads the repo name.

## Add the portrait

Save an image as `src/assets/portrait.jpg` (or `.png` / `.webp`). It replaces the placeholder automatically.

## Where content lives

- `src/data/site.ts`: names, offers, books, episodes, testimonials, FAQs, press
- `src/content/insights/*.md`: articles (re-run `npm run data` after adding one)
- `src/pages/`: one file per page
