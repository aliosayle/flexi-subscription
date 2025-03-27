// JWT secret with better security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

// Constants for the application
const constants = {
  JWT_SECRET,
  PORT: process.env.PORT || 5000,
  HOST: process.env.HOST || '0.0.0.0',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  CORS_ORIGINS: ['http://localhost:8080', 'http://192.168.10.70:8080'],
  TOKEN_EXPIRY: '1h',
  ALGORITHM: 'HS256',
  COOKIE_MAX_AGE: 3600000 // 1 hour
};

module.exports = constants; 