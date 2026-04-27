export const env = {
  JWT_SECRET: process.env.JWT_SECRET || "fallback_secret_key_dev_only",
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development"
};
