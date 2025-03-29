import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socket, connectSocket } from '../utils/socket';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ContestantJoin = () => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Connect to socket when component mounts
    connectSocket();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim() || !roomCode.trim()) {
      setError('Please enter your name and room code');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Join the room
      const response = await axios.post(`${API_URL}/rooms/join`, {
        name,
        roomCode,
        socketId: socket.id
      });
      
      // Store contestant info in localStorage
      localStorage.setItem('contestant', JSON.stringify({
        id: response.data.contestant._id,
        name: response.data.contestant.name,
        roomCode: response.data.contestant.roomCode,
        sessionId: response.data.session._id
      }));
      
      // Navigate to buzzer page
      navigate(`/game/${roomCode}`);
      
    } catch (err) {
      console.error('Error joining game:', err);
      setError(err.response?.data?.error || 'Failed to join the game');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Join Trivia Game</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="roomCode" className="block text-gray-700 font-medium mb-2">
              Room Code
            </label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room code"
              maxLength={6}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-medium text-white ${
              loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <a href="/host" className="text-blue-600 hover:underline">
            Host a game instead
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContestantJoin; 