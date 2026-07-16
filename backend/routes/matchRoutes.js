import express from 'express';
import { getRecommendations, browseUsers } from '../controllers/matchController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/recommendations', protect, getRecommendations);
router.get('/browse', protect, browseUsers);

export default router;
