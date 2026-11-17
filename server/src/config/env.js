import 'dotenv/config';

/**
 * Reads a required environment variable.
 * @param {string} name - Variable name.
 * @returns {string} Value.
 * @throws {Error} When the variable is missing.
 */
const required = (name) => {
  const value = process.env[name];

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name} (see server/.env.example)`);
  }

  return value;
};

/**
 * Converts a duration like "7d", "12h", "30m" to milliseconds.
 * @param {string} value - Duration string.
 * @returns {number} Milliseconds.
 */
const durationToMs = (value) => {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

  return Number(match[1]) * units[match[2]];
};

/** Application configuration loaded from `.env`. */
export const ENV = Object.freeze({
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtExpiresInMs: durationToMs(process.env.JWT_EXPIRES_IN || '7d'),
  cookieName: process.env.COOKIE_NAME || 'sinhs_token',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  seedDefaultPassword: process.env.SEED_DEFAULT_PASSWORD || '',
});
