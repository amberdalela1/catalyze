# Catalyze

A non-profit connection app that helps organizations discover partners, share resources, and grow together — powered by AI recommendations.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Capacitor (iOS)
- **Backend**: Node.js + Express + Sequelize + MSSQL
- **AI**: OpenAI GPT for partnership recommendations
- **Auth**: JWT (email/password, Google, Apple, Phone/SMS OTP)

## Getting Started

### Prerequisites

- Node.js 18+
- Microsoft SQL Server (local or remote)
- OpenAI API key (optional — recommendations disabled without it)

### Setup

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your database credentials, JWT secret, etc.
```

### Development

```bash
# Start frontend dev server (port 3000)
npm run dev

# Start backend dev server (port 4000)
npm run server:dev
```

Open http://localhost:3000 in Chrome to test.

### Production Build

```bash
npm run build
```

### iOS (Capacitor)

```bash
npm run build
npm run cap:sync
npm run cap:open:ios
```

## Project Structure

```
src/                    # React frontend
  components/ui/        # Custom UI components
  components/layout/    # App layout with tab bar
  pages/                # Page components
  services/             # API client, auth service
  context/              # Auth context provider
  utils/                # Platform detection
  styles/               # Global CSS & design tokens
server/src/             # Express backend
  routes/               # API route handlers
  models/               # Sequelize models
  middleware/            # Auth & validation middleware
  services/             # OpenAI service
  config/               # Database config
```
