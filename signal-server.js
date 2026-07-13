const { Server } = require('socket.io');
const http = require('http');

const PORT = 3001;
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const users = new Map();

io.on('connection', (socket) => {
  console.log('[Signal] Connected:', socket.id);

  socket.on('register', (userId) => {
    users.set(userId, socket.id);
    socket.data.userId = userId;
    console.log(`[Signal] Registered: ${userId} -> ${socket.id}`);
  });

  socket.on('call:ring', ({ to, callType, from }) => {
    const targetSocket = users.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:ring', { from, callType });
      console.log(`[Signal] Ring: ${from} -> ${to} (${callType})`);
    }
  });

  socket.on('call:accept', ({ to }) => {
    const targetSocket = users.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:accept', { from: socket.data.userId });
      console.log(`[Signal] Accept: ${socket.data.userId} -> ${to}`);
    }
  });

  socket.on('call:reject', ({ to }) => {
    const targetSocket = users.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:rejected', { from: socket.data.userId });
      console.log(`[Signal] Reject: ${socket.data.userId} -> ${to}`);
    }
  });

  socket.on('call:end', ({ to }) => {
    const targetSocket = users.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:end', { from: socket.data.userId });
      console.log(`[Signal] End: ${socket.data.userId} -> ${to}`);
    }
  });

  socket.on('call:offer', ({ to, offer, callType }) => {
    const targetSocket = users.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:offer', { from: socket.data.userId, offer, callType });
      console.log(`[Signal] Offer: ${socket.data.userId} -> ${to}`);
    }
  });

  socket.on('call:answer', ({ to, answer }) => {
    const targetSocket = users.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:answer', { answer });
      console.log(`[Signal] Answer: ${socket.data.userId} -> ${to}`);
    }
  });

  socket.on('call:ice-candidate', ({ to, candidate }) => {
    const targetSocket = users.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:ice-candidate', { candidate });
      console.log(`[Signal] ICE: ${socket.data.userId} -> ${to}`);
    }
  });

  socket.on('disconnect', () => {
    if (socket.data.userId) {
      users.delete(socket.data.userId);
      console.log(`[Signal] Disconnected: ${socket.data.userId}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Signal] Signaling server running on port ${PORT}`);
});
