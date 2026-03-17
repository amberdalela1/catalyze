<!-- Use this file to provide workspace-specific custom instructions to Copilot. -->

# Catalyze — Non-Profit Connection App

## Architecture
- **Frontend**: React 18 + Vite + TypeScript + Capacitor (iOS)
- **Backend**: Node.js + Express + Sequelize + MSSQL (in `server/`)
- **AI**: OpenAI GPT for feed recommendations
- **Auth**: JWT (email/password, Google, Apple, Phone/SMS OTP)

## Project Structure
- `src/` — React frontend (components, pages, hooks, services, context, utils)
- `server/src/` — Express backend (routes, models, middleware, services, config)
- `capacitor.config.ts` — iOS native wrapper config

## Conventions
- Custom UI components in `src/components/ui/` — no component library
- CSS Modules for styling
- Design tokens defined in `src/styles/global.css`
- Platform detection via `src/utils/platform.ts`
- API calls via `src/services/api.ts`

## Commands
- `npm run dev` — Start frontend dev server (port 3000)
- `npm run server:dev` — Start backend dev server (port 4000)
- `npm run build` — Build frontend for production
- `npm run cap:sync` — Sync web build to iOS project
- `npm run cap:open:ios` — Open iOS project in Xcode
