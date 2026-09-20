# AGENTS.md

Simple **Vite + React** static site with GitHub Pages deployment. No server-side code, all client-side.

## Commands

- `npm run dev` — start local development server at http://localhost:5173
- `npm run build` — build static files to `dist/`
- `npm run preview` — locally preview the built site

## Deployment

This site deploys automatically to GitHub Pages when you push to `main`. Enable GitHub Pages in your repo settings (Source: "GitHub Actions").

The deployed URL will be: `https://k-builds.github.io/language-study/`

## What's in this repo

- `index.html` — entry point
- `src/main.tsx` — React entry point
- `src/App.tsx` — the Match game (Gurmukhi alphabet flashcards)
- `src/globals.css` — all styles (hand-written, no Tailwind utilities used)
- `public/` — static assets (favicon, og.png, etc.)

## The app

A matching game with 41 hardcoded Gurmukhi alphabet pairs. Features:
- Select which pairs to practice from the built-in set
- Search/filter pairs by term or definition
- Endless matching rounds with score, streaks, and accuracy tracking
- Sound effects for correct/incorrect matches
