import mongoose from 'mongoose';

const swapSessionSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  tokenCost: { type: Number, default: 1, min: 0 },
  meetingRoomId: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const SwapSession = mongoose.model('SwapSession', swapSessionSchema);
export default SwapSession;
