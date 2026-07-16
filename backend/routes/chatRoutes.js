import express from 'express';
import { getChatHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:recipientId', protect, getChatHistory);

export default router;
