# Mental Boost

Mental Boost is a Next.js web app built for General Ability prep, delivering speed and cognitive training through short, gamified drills. It combines adaptive difficulty, XP-based progression, and performance analytics to help users strengthen both numerical and verbal skills.

## Features
- Adaptive drill sessions across math and verbal topics (mental math, estimation, pattern recognition, working memory, and more).
- 3‑minute Warmup mode for daily reflex practice.
- XP, combo streaks, and personal best tracking.
- Performance analytics with weak-topic detection and improvement recommendations.
- Customizable visual themes with audio/particle effects.

## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- SQLite + Drizzle ORM (better-sqlite3)
- Zustand for state management
- Tailwind CSS, Framer Motion, Recharts, Lucide Icons

## Getting Started

### Prerequisites
- Node.js (LTS) and npm

### Install dependencies
```bash
npm ci
```

### Seed the database
```bash
npm run db:seed
```
This creates `mental-boost.db` with topics and questions.

### Run locally
```bash
npm run dev
```
Open http://localhost:3000 to view the app.

### Production build
```bash
npm run build
npm run start
```

## Project Structure
- `src/app` – Next.js routes (dashboard, drills, API)
- `src/components` – UI panels and theme effects
- `src/db` – SQLite schema and seed script
- `src/lib` – question generators, utilities, audio engine
- `src/store` – Zustand stores for drills and themes

## Scripts
- `npm run dev` – start the dev server
- `npm run build` – lint + production build
- `npm run start` – start the production server
- `npm run lint` – run ESLint
- `npm run db:seed` – seed the SQLite database
- `npm run db:push` – push schema changes with Drizzle Kit
