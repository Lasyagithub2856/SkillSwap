import SwapSession from '../models/SwapSession.js';
import User from '../models/User.js';

// @desc    Book a new swap session
// @route   POST /api/sessions/book
// @access  Private
export const bookSession = async (req, res) => {
  const { teacherId, skill, startTime, endTime } = req.body;
  const learnerId = req.user._id;

  if (teacherId === learnerId.toString()) {
    return res.status(400).json({ message: 'You cannot book a session with yourself' });
  }

  const reqStartTime = new Date(startTime);
  const reqEndTime = new Date(endTime);

  if (isNaN(reqStartTime.getTime()) || isNaN(reqEndTime.getTime())) {
    return res.status(400).json({ message: 'Invalid start or end time' });
  }

  if (reqStartTime >= reqEndTime) {
    return res.status(400).json({ message: 'Start time must be before end time' });
  }

  if (reqStartTime <= new Date()) {
    return res.status(400).json({ message: 'Session must be booked for a future date/time' });
  }

  try {
    const teacher = await User.findById(teacherId);
    const learner = await User.findById(learnerId);

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // 1. Check if learner has enough tokens
    if (learner.tokens < 1) {
      return res.status(400).json({ message: 'You do not have enough SwapTokens to book a session. Please teach others to earn more tokens!' });
    }

    // 2. Conflict Check: Check for overlapping sessions (pending or accepted)
    const overlappingSession = await SwapSession.findOne({
      $or: [
        { teacher: teacherId },
        { learner: teacherId },
        { teacher: learnerId },
        { learner: learnerId }
      ],
      status: { $in: ['pending', 'accepted'] },
      startTime: { $lt: reqEndTime },
      endTime: { $gt: reqStartTime }
    });

    if (overlappingSession) {
      return res.status(400).json({
        message: 'Scheduling Conflict: One of the participants already has a pending or accepted session during this time slot.'
      });
    }

    // 3. Deduct token from learner immediately (escrow)
    learner.tokens -= 1;
    await learner.save();

    // 4. Create the session (generate a meeting room ID)
    const meetingRoomId = `room-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
    const session = await SwapSession.create({
      teacher: teacherId,
      learner: learnerId,
      skill,
      startTime: reqStartTime,
      endTime: reqEndTime,
      tokenCost: 1,
      meetingRoomId,
      status: 'pending'
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's sessions (both as teacher and learner)
// @route   GET /api/sessions
// @access  Private
export const getSessions = async (req, res) => {
  const userId = req.user._id;

  try {
    const sessions = await SwapSession.find({
      $or: [{ teacher: userId }, { learner: userId }]
    })
      .populate('teacher', 'name email bio avatar')
      .populate('learner', 'name email bio avatar')
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept or reject a pending booking
// @route   PUT /api/sessions/:id/respond
// @access  Private
export const respondToSession = async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  const sessionId = req.params.id;
  const userId = req.user._id;

  try {
    const session = await SwapSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only the teacher can accept or reject bookings
    if (session.teacher.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the teacher can respond to this booking' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ message: 'Session is not in a pending state' });
    }

    if (action === 'accept') {
      session.status = 'accepted';
      await session.save();
      res.json({ message: 'Session accepted successfully', session });
    } else if (action === 'reject') {
      session.status = 'rejected';
      await session.save();

      // Refund the token back to the learner
      const learner = await User.findById(session.learner);
      if (learner) {
        learner.tokens += 1;
        await learner.save();
      }

      res.json({ message: 'Session rejected and token refunded to learner', session });
    } else {
      res.status(400).json({ message: "Invalid action. Must be 'accept' or 'reject'" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a booked session (can be cancelled by either party)
// @route   PUT /api/sessions/:id/cancel
// @access  Private
export const cancelSession = async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user._id;

  try {
    const session = await SwapSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.teacher.toString() !== userId.toString() && session.learner.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to cancel this session' });
    }

    if (session.status === 'completed' || session.status === 'cancelled' || session.status === 'rejected') {
      return res.status(400).json({ message: `Cannot cancel session with status: ${session.status}` });
    }

    session.status = 'cancelled';
    await session.save();

    // Refund the token to the learner
    const learner = await User.findById(session.learner);
    if (learner) {
      learner.tokens += 1;
      await learner.save();
    }

    res.json({ message: 'Session cancelled and token refunded to learner', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark a session as completed and payout the tokens
// @route   PUT /api/sessions/:id/complete
// @access  Private
export const completeSession = async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user._id;

  try {
    const session = await SwapSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only the teacher or learner can mark as complete, usually the teacher initiates it
    if (session.teacher.toString() !== userId.toString() && session.learner.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this session' });
    }

    if (session.status !== 'accepted') {
      return res.status(400).json({ message: `Cannot complete session with status: ${session.status}` });
    }

    session.status = 'completed';
    await session.save();

    // Transfer token to the teacher
    const teacher = await User.findById(session.teacher);
    if (teacher) {
      teacher.tokens += session.tokenCost;
      await teacher.save();
    }

    res.json({ message: 'Session completed successfully. SwapToken payout processed.', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a review for a completed session
// @route   PUT /api/sessions/:id/review
// @access  Private
export const submitReview = async (req, res) => {
  const { rating, review } = req.body;
  const sessionId = req.params.id;
  const userId = req.user._id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Please provide a rating between 1 and 5' });
  }

  try {
    const session = await SwapSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only the learner can rate the session
    if (session.learner.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the learner can submit reviews' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed sessions' });
    }

    session.rating = rating;
    session.review = review || '';
    await session.save();

    res.json({ message: 'Review submitted successfully', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
