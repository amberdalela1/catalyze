import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sequelize } from './config/database';
import { User } from './models';
import { seedDatabase } from './seed';
import authRoutes from './routes/auth';
import organizationRoutes from './routes/organizations';
import postRoutes from './routes/posts';
import partnershipRoutes from './routes/partnerships';
import feedRoutes from './routes/feed';
import favoriteRoutes from './routes/favorites';
import messageRoutes from './routes/messages';
import scrapeRoutes from './routes/scrape';
import mediaRoutes from './routes/media';
import resourceRoutes from './routes/resources';
import adminRoutes from './routes/admin';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// Validate critical env vars in production
if (isProd) {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'CORS_ORIGIN'];
  const missing = required.filter(key => !process.env[key]);
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    missing.push('DATABASE_URL or DB_HOST');
  }
  if (missing.length > 0) {
    console.error(`FATAL: Missing required env vars for production: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'change-this-secret') {
    console.error('FATAL: JWT_SECRET must be changed from the default value in production');
    process.exit(1);
  }
}

// Security middleware
app.use(helmet());

// Allow multiple origins for CORS (comma-separated in env)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,capacitor://localhost').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Pass false to reject, but don't throw to avoid 500
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser/Capacitor compatibility
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Serve uploaded media files
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/partnerships', partnershipRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/scrape-contact', scrapeRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    if (!isProd) {
      // Use FORCE_SYNC=true env var to explicitly reset the database when needed.
      if (process.env.FORCE_SYNC === 'true') {
        await sequelize.sync({ force: true });
        console.log('Models force synced (data reset)');
      } else {
        // Try alter first; if SQLite FK constraints block it, fall back to plain sync
        try {
          await sequelize.sync({ alter: true });
        } catch {
          await sequelize.sync();
        }
        console.log('Models synced');
      }
    } else {
      // In production, sync without alter (safe — only creates missing tables, never modifies)
      await sequelize.sync();
      console.log('Production: tables synced');
    }

    // Auto-seed if database is empty (first deploy / fresh DB)
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Empty database detected — running auto-seed...');
      await seedDatabase();
    }
  } catch (error) {
    console.warn('Database connection failed — running without DB:', (error as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();

export default app;
