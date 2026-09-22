const dotenv = require('dotenv');

dotenv.config();

const requiredInProduction = ['DATABASE_URL', 'JWT_SECRET'];

if (process.env.NODE_ENV === 'production') {
  for (const key of requiredInProduction) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  geminiApiKey: process.env.GEMINI_API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info',
};
