const dotenv = require('dotenv');

dotenv.config();

const requiredInProduction = ['DATABASE_URL', 'JWT_SECRET'];

if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  logLevel: process.env.LOG_LEVEL || 'info',
};
