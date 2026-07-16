import User from '../models/User.js';
import { generateMatchExplanation } from '../services/geminiService.js';

// @desc    Get recommended swap partners for the logged-in user
// @route   GET /api/matches/recommendations
// @access  Private
export const getRecommendations = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract names of skills to teach and learn for the current user
    const teachSkills = currentUser.skillsToTeach.map(s => s.name.toLowerCase());
    const learnSkills = currentUser.skillsToLearn.map(s => s.name.toLowerCase());

    // Find other users who:
    // 1. Teach something the current user wants to learn OR
    // 2. Want to learn something the current user teaches.
    const potentialMatches = await User.find({
      _id: { $ne: currentUser._id }, // Exclude self
      $or: [
        { 'skillsToTeach.name': { $in: currentUser.skillsToLearn.map(s => new RegExp(`^${s.name}$`, 'i')) } },
        { 'skillsToLearn.name': { $in: currentUser.skillsToTeach.map(s => new RegExp(`^${s.name}$`, 'i')) } }
      ]
    }).select('-password');

    // Rank matches and generate descriptions
    const matchesWithScores = await Promise.all(
      potentialMatches.map(async (matchUser) => {
        // Calculate overlap scores
        const matchTeachSkills = matchUser.skillsToTeach.map(s => s.name.toLowerCase());
        const matchLearnSkills = matchUser.skillsToLearn.map(s => s.name.toLowerCase());

        // How many of their teaching skills match our learning needs (Direct Match)
        const teachOverlap = matchTeachSkills.filter(s => learnSkills.includes(s));
        
        // How many of our teaching skills match their learning needs (Direct Match)
        const learnOverlap = matchLearnSkills.filter(s => teachSkills.includes(s));

        // Total score calculation:
        // Double-match (mutual swap) is weighted highest.
        const score = (teachOverlap.length * 3) + (learnOverlap.length * 2);

        // Generate AI explanation (we'll call the Gemini helper)
        let aiExplanation = '';
        if (score > 0) {
          aiExplanation = await generateMatchExplanation(currentUser, matchUser);
        } else {
          aiExplanation = 'General recommendation based on your profile.';
        }

        return {
          user: matchUser,
          score,
          mutualMatch: teachOverlap.length > 0 && learnOverlap.length > 0,
          teachOverlap,
          learnOverlap,
          aiExplanation
        };
      })
    );

    // Sort by compatibility score in descending order
    matchesWithScores.sort((a, b) => b.score - a.score);

    res.json(matchesWithScores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users for general browsing
// @route   GET /api/matches/browse
// @access  Private
export const browseUsers = async (req, res) => {
  const { search, category } = req.query;
  const userId = req.user._id;

  try {
    let query = { _id: { $ne: userId } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { 'skillsToTeach.name': { $regex: search, $options: 'i' } },
        { 'skillsToLearn.name': { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'skillsToTeach.category': { $regex: category, $options: 'i' } },
        { 'skillsToLearn.category': { $regex: category, $options: 'i' } }
      );
    }

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
