import { Sequelize } from 'sequelize';
import path from 'path';

// Priority: DATABASE_URL (Render PostgreSQL) > DB_HOST (MSSQL) > SQLite (local dev)
const databaseUrl = process.env.DATABASE_URL;
const useSQLite = !databaseUrl && (!process.env.DB_HOST || process.env.DB_DIALECT === 'sqlite');

// Use persistent disk path if available (e.g., Render), otherwise local path
const sqlitePath = process.env.SQLITE_PATH
  || path.join(__dirname, '..', '..', 'catalyze-dev.sqlite');

function createSequelize(): Sequelize {
  // PostgreSQL via connection string (Render, Neon, Supabase, etc.)
  if (databaseUrl) {
    return new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  }

  // SQLite for local development
  if (useSQLite) {
    return new Sequelize({
      dialect: 'sqlite',
      storage: sqlitePath,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    });
  }

  // MSSQL for production (AWS RDS)
  return new Sequelize({
    dialect: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_NAME || 'catalyze',
    username: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    dialectOptions: {
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
      },
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

export const sequelize = createSequelize();
