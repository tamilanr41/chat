import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let signalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  if (!token) return null;

  if (!socket) {
    socket = io('https://chat-back-ac0h.onrender.com', {
      auth: { token },
      autoConnect: true,
    });
  }

  return socket;
}

export function getSignalSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  if (!signalSocket) {
    signalSocket = io('https://chat-back-ac0h.onrender.com', {
      autoConnect: true,
    });
  }

  return signalSocket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (signalSocket) {
    signalSocket.disconnect();
    signalSocket = null;
  }
}
