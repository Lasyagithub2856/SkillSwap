import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { parseProfileText } from '../services/geminiService.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'skillswap_super_secret_jwt_token_key_123!', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      tokens: 5, // Give 5 free tokens on signup
      skillsToTeach: [],
      skillsToLearn: [],
      availability: []
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        tokens: user.tokens,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
        availability: user.availability,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        tokens: user.tokens,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
        availability: user.availability,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        tokens: user.tokens,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
        availability: user.availability,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile details manually
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      
      if (req.body.skillsToTeach) user.skillsToTeach = req.body.skillsToTeach;
      if (req.body.skillsToLearn) user.skillsToLearn = req.body.skillsToLearn;
      if (req.body.availability) user.availability = req.body.availability;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        bio: updatedUser.bio,
        tokens: updatedUser.tokens,
        skillsToTeach: updatedUser.skillsToTeach,
        skillsToLearn: updatedUser.skillsToLearn,
        availability: updatedUser.availability,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Use AI to parse raw text and populate skills
// @route   POST /api/auth/profile/ai-parse
// @access  Private
export const aiParseBio = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'No text provided for analysis' });
  }

  try {
    const parsedSkills = await parseProfileText(text);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update bio and extracted skills
    user.bio = text;
    user.skillsToTeach = parsedSkills.skillsToTeach;
    user.skillsToLearn = parsedSkills.skillsToLearn;
    
    await user.save();

    res.json({
      message: 'Profile parsed successfully by AI',
      bio: user.bio,
      skillsToTeach: user.skillsToTeach,
      skillsToLearn: user.skillsToLearn
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to process text with Gemini AI' });
  }
};
