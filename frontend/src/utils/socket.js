import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Create socket instance with configuration
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  transports: ['polling'], // Force polling transport for Heroku compatibility
  upgrade: false, // Prevent upgrading to WebSockets
  forceNew: true,
  path: '/socket.io'
});

// Connection management
export const connectSocket = () => {
  if (!socket.connected) {
    console.log('Socket connecting to:', SOCKET_URL);
    try {
      socket.connect();
      console.log('Socket connecting...');
      
      // Add one-time connection confirmation handler
      socket.once('connect', () => {
        console.log('Socket connected with ID:', socket.id);
      });
      
      // Add error handler
      socket.once('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    } catch (error) {
      console.error('Error connecting socket:', error);
    }
  } else {
    console.log('Socket already connected with ID:', socket.id);
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log('Socket disconnected');
  }
};

// Room management
export const joinRoom = (roomCode) => {
  socket.emit('join-room', roomCode);
  console.log(`Joining room: ${roomCode}`);
};

export const hostRoom = (roomCode) => {
  socket.emit('host-room', roomCode);
  console.log(`Hosting room: ${roomCode}`);
};

// Game actions
export const emitBuzz = (sessionId, contestantId) => {
  socket.emit('buzz', { sessionId, contestantId });
  console.log('Buzz emitted');
};

export const enableBuzzer = (sessionId) => {
  socket.emit('enable-buzzer', { sessionId });
  console.log('Buzzer enabled');
};

export const submitAnswer = (sessionId, contestantId, questionId, answer) => {
  socket.emit('submit-answer', { 
    sessionId, 
    contestantId, 
    questionId, 
    answer 
  });
  console.log('Answer submitted');
};

// Custom hook for socket connection status
export const useSocketStatus = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      console.log('Socket connected');
    };
    
    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    };
    
    const onError = (error) => {
      console.error('Socket error:', error);
    };
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
    };
  }, []);
  
  return isConnected;
};

// Initialize event listeners for debugging
if (process.env.NODE_ENV === 'development') {
  socket.onAny((event, ...args) => {
    console.log(`[Socket Event] ${event}:`, args);
  });
} 