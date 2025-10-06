import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI,
  ARCJET_ENV: process.env.ARCJET_ENV,
  ARCJET_KEY: process.env.ARCJET_KEY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
};