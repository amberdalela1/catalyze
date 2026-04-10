import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sequelize } from './config/database';
import authRoutes from './routes/auth';
import organizationRoutes from './routes/organizations';
import postRoutes from './routes/posts';
import partnershipRoutes from './routes/partnerships';
import feedRoutes from './routes/feed';
import favoriteRoutes from './routes/favorites';
import messageRoutes from './routes/messages';
import scrapeRoutes from './routes/scrape';

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/partnerships', partnershipRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/scrape-contact', scrapeRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    if (process.env.NODE_ENV !== 'production') {
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
