import express from 'express';
import {
  bookSession,
  getSessions,
  respondToSession,
  cancelSession,
  completeSession,
  submitReview
} from '../controllers/sessionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/book', protect, bookSession);
router.route('/').get(protect, getSessions);

router.put('/:id/respond', protect, respondToSession);
router.put('/:id/cancel', protect, cancelSession);
router.put('/:id/complete', protect, completeSession);
router.put('/:id/review', protect, submitReview);

export default router;
