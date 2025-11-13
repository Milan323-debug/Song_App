import express from 'express';
import { getDominantColor } from '../controllers/dominant.controller.js';

const router = express.Router();

// GET /api/dominant?url=<image_url>
router.get('/', getDominantColor);

export default router;
