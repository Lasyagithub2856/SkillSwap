import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'], default: 'Beginner' }
});

const availabilitySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday, 6 = Saturday
  startTime: { type: String, required: true }, // "HH:MM" in UTC (24-hour format)
  endTime: { type: String, required: true }   // "HH:MM" in UTC (24-hour format)
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  skillsToTeach: [skillSchema],
  skillsToLearn: [skillSchema],
  tokens: { type: Number, default: 5, min: 0 },
  availability: [availabilitySchema],
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
export default User;
