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
      // sync() only creates tables that don't exist — never alters or drops existing ones.
      // Use explicit migrations for schema changes to avoid data loss.
      await sequelize.sync();
      console.log('Models synced');
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
