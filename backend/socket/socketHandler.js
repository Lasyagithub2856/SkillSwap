import ChatMessage from '../models/ChatMessage.js';

// Map of userId -> socket.id to handle direct messages
const userSocketMap = new Map();

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Register user ID with socket ID
    socket.on('register-user', (userId) => {
      userSocketMap.set(userId, socket.id);
      console.log(`User ${userId} registered to socket ${socket.id}`);
    });

    // --- REAL-TIME PRIVATE CHAT ---
    socket.on('send-message', async ({ senderId, recipientId, content }) => {
      try {
        // Save to Database
        const message = await ChatMessage.create({
          sender: senderId,
          recipient: recipientId,
          content
        });

        // Emit back to sender
        socket.emit('receive-message', message);

        // Emit to recipient if online
        const recipientSocketId = userSocketMap.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive-message', message);
        }
      } catch (error) {
        console.error('Error saving chat message:', error);
      }
    });

    // --- CLASSROOM WEB SOCKETS (WebRTC, Whiteboard, Code Editor) ---
    // Join a classroom room
    socket.on('join-room', ({ roomId, userId, userName }) => {
      socket.join(roomId);
      console.log(`User ${userName} (${userId}) joined room: ${roomId}`);

      // Notify other users in the room that a peer joined
      socket.to(roomId).emit('peer-joined', { userId, userName, socketId: socket.id });
    });

    // Handle WebRTC signaling: offer, answer, ice-candidates
    socket.on('signal', ({ targetSocketId, signalData }) => {
      io.to(targetSocketId).emit('signal', {
        senderSocketId: socket.id,
        signalData
      });
    });

    // Sync Whiteboard Drawing Coordinates
    // data contains: { prevX, prevY, currX, currY, color, width }
    socket.on('draw', ({ roomId, drawingData }) => {
      socket.to(roomId).emit('draw', drawingData);
    });

    // Sync Whiteboard Clear Canvas
    socket.on('clear-canvas', ({ roomId }) => {
      socket.to(roomId).emit('clear-canvas');
    });

    // Sync Coding Workspace / Text Editor
    // data contains: { codeText }
    socket.on('code-change', ({ roomId, codeText }) => {
      socket.to(roomId).emit('code-change', codeText);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      // Remove from map
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          console.log(`User ${userId} unregistered`);
          break;
        }
      }
    });
  });
};

export default socketHandler;
