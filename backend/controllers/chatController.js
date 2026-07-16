import ChatMessage from '../models/ChatMessage.js';

// @desc    Get chat history between current user and another user
// @route   GET /api/chat/:recipientId
// @access  Private
export const getChatHistory = async (req, res) => {
  const { recipientId } = req.params;
  const senderId = req.user._id;

  try {
    const messages = await ChatMessage.find({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId }
      ]
    }).sort({ timestamp: 1 }); // Oldest first

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
