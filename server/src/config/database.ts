import { Sequelize } from 'sequelize';
import path from 'path';

const useSQLite = !process.env.DB_HOST || process.env.DB_DIALECT === 'sqlite';

// Use persistent disk path if available (e.g., Render), otherwise local path
const sqlitePath = process.env.SQLITE_PATH
  || path.join(__dirname, '..', '..', 'catalyze-dev.sqlite');

export const sequelize = useSQLite
  ? new Sequelize({
      dialect: 'sqlite',
      storage: sqlitePath,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    })
  : new Sequelize({
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
